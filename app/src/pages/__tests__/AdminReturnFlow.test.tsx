// app/src/pages/__tests__/AdminReturnFlow.test.tsx
//
// 連携の完了後、backend は /admin?x_connect=... への 302 で管理画面に戻す。ページ全体が
// 再読み込みされ、メモリ上のログイン状態は失われるため、/login に飛ばされる。
// ログインし直した後に、連携の結果が表示されることを、ルーターごと通しで確認する。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import Router from "@/router/Router";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { X_CONNECT_RESULT_MESSAGES } from "@/components/utils/xConnect";

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string>) },
    ...init,
  });

// 管理画面が呼ぶ API を、URL ごとに応答する
const installFetch = ({ loginOk }: { loginOk: boolean }) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/auth/sign_in")) {
      return loginOk
        ? jsonResponse(
            { status: "ok", message: "ok", data: { id: 1, email: "admin@example.com" } },
            { headers: { Authorization: "Bearer test-token" } },
          )
        : jsonResponse({ error: "invalid" }, { status: 401 });
    }
    if (url.includes("/blogs")) return jsonResponse({ blogs: [] });
    return jsonResponse({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

// 実際のアプリ (App.tsx) と同じ入れ子: Router > Theme > Auth
const renderApp = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ThemeProvider>
        <AuthProvider>
          <Router />
          <LocationProbe />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

const login = async () => {
  await userEvent.type(await screen.findByPlaceholderText("your@email.com"), "admin@example.com");
  await userEvent.type(screen.getByPlaceholderText("パスワードを入力してください"), "password");
  await userEvent.click(screen.getByRole("button", { name: /^ログイン$/ }));
};

describe("連携完了後の戻り (/admin?x_connect=... → /login → ログイン → 結果表示)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(["success", "denied", "error"] as const)(
    "x_connect=%s で戻ると、未ログインなら /login を経由し、ログイン後に結果が表示される",
    async (result) => {
      installFetch({ loginOk: true });
      renderApp(`/admin?x_connect=${result}`);

      // 未ログインなので /login に飛ばされる
      await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));

      await login();

      // ログイン後は、結果付きの /admin に戻り、結果が表示され、URL からは消える
      expect(await screen.findByText(X_CONNECT_RESULT_MESSAGES[result].message)).toBeInTheDocument();
      await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/admin"));
    },
  );

  it("通常のログイン (遷移元なし) は、従来どおり /admin に入り、結果は何も表示しない", async () => {
    installFetch({ loginOk: true });
    renderApp("/login");

    await login();

    expect(await screen.findByRole("heading", { name: "X（旧Twitter）連携" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("未知の x_connect (細工された値) では、ログイン後も結果を表示しない", async () => {
    installFetch({ loginOk: true });
    renderApp("/admin?x_connect=%3Cb%3Ehacked%3C%2Fb%3E");

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
    await login();

    expect(await screen.findByRole("heading", { name: "X（旧Twitter）連携" })).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("hacked");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ログインに失敗した場合は、結果を表示せず /login に留まる (未認証で管理画面に入れない)", async () => {
    installFetch({ loginOk: false });
    renderApp("/admin?x_connect=success");

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
    await login();

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
    expect(screen.queryByText(X_CONNECT_RESULT_MESSAGES.success.message)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "X（旧Twitter）連携" })).not.toBeInTheDocument();
  });
});

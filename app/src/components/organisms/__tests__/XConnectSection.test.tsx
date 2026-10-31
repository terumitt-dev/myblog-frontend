// app/src/components/organisms/__tests__/XConnectSection.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import XConnectSection from "../XConnectSection";
import { AuthProvider } from "@/context/AuthContext";
import { X_CONNECT_RESULT_MESSAGES } from "@/components/utils/xConnect";

// 現在の URL (クエリ) を画面に出して、URL の掃除を検証できるようにする
const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};

const renderSection = (
  initialEntry = "/admin",
  navigate: (url: string) => void = vi.fn(),
) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <XConnectSection navigate={navigate} />
        <LocationProbe />
      </MemoryRouter>
    </AuthProvider>,
  );

const mockConnectResponse = (body: unknown, init: { status?: number } = {}) => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("XConnectSection", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("連携の開始", () => {
    it("ボタンと説明を表示する", () => {
      renderSection();
      expect(screen.getByRole("heading", { name: "X（旧Twitter）連携" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Xと連携する" })).toBeEnabled();
    });

    it("確認ダイアログでキャンセルすると、APIを呼ばず遷移もしない", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const fetchMock = mockConnectResponse({});
      const navigate = vi.fn();
      renderSection("/admin", navigate);

      await userEvent.click(screen.getByRole("button", { name: "Xと連携する" }));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it("確認後、POST /admin/x/connect を呼び、返された認可URLに遷移する", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const authorizeUrl = "https://twitter.com/i/oauth2/authorize?state=abc";
      const fetchMock = mockConnectResponse({ authorize_url: authorizeUrl });
      const navigate = vi.fn();
      renderSection("/admin", navigate);

      await userEvent.click(screen.getByRole("button", { name: "Xと連携する" }));

      await waitFor(() => expect(navigate).toHaveBeenCalledWith(authorizeUrl));
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("/api/admin/x/connect");
      expect(init.method).toBe("POST");
    });

    it("遷移が始まるまでは送信中表示で、二重に押せない", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      mockConnectResponse({ authorize_url: "https://twitter.com/i/oauth2/authorize?state=abc" });
      renderSection("/admin", vi.fn());

      await userEvent.click(screen.getByRole("button", { name: "Xと連携する" }));

      const busyButton = await screen.findByRole("button", { name: /Xに移動中/ });
      expect(busyButton).toBeDisabled();
      expect(busyButton).toHaveAttribute("aria-busy", "true");
    });

    it.each([
      ["別ホスト", "https://evil.example.com/authorize?state=abc"],
      ["http", "http://twitter.com/authorize?state=abc"],
      ["javascript:", "javascript:alert(1)"],
      ["userinfo偽装", "https://twitter.com@evil.example.com/authorize"],
    ])("想定外の認可URL (%s) には遷移せず、エラーを表示する", async (_name, bad) => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      mockConnectResponse({ authorize_url: bad });
      const navigate = vi.fn();
      renderSection("/admin", navigate);

      await userEvent.click(screen.getByRole("button", { name: "Xと連携する" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Xとの連携を開始できませんでした");
      expect(navigate).not.toHaveBeenCalled();
      // 失敗後は、もう一度押せる
      expect(screen.getByRole("button", { name: "Xと連携する" })).toBeEnabled();
    });

    it("認可URLが無いレスポンスでもエラーを表示し、遷移しない", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      mockConnectResponse({});
      const navigate = vi.fn();
      renderSection("/admin", navigate);

      await userEvent.click(screen.getByRole("button", { name: "Xと連携する" }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
    });

    it.each([503, 502, 401])("API が %i を返した場合、エラーを表示し、もう一度押せる", async (status) => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      mockConnectResponse({ error: "failed" }, { status });
      const navigate = vi.fn();
      renderSection("/admin", navigate);

      await userEvent.click(screen.getByRole("button", { name: "Xと連携する" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Xとの連携を開始できませんでした");
      expect(navigate).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Xと連携する" })).toBeEnabled();
    });

    it("通信自体が失敗した場合もエラーを表示し、もう一度押せる", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
      renderSection("/admin", vi.fn());

      await userEvent.click(screen.getByRole("button", { name: "Xと連携する" }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Xと連携する" })).toBeEnabled();
    });

    it("認可画面から「戻る」で復帰 (bfcache) した場合、ボタンを押せる状態に戻す", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      mockConnectResponse({ authorize_url: "https://twitter.com/i/oauth2/authorize?state=abc" });
      renderSection("/admin", vi.fn());

      await userEvent.click(screen.getByRole("button", { name: "Xと連携する" }));
      expect(await screen.findByRole("button", { name: /Xに移動中/ })).toBeDisabled();

      const event = new Event("pageshow") as PageTransitionEvent;
      Object.defineProperty(event, "persisted", { value: true });
      window.dispatchEvent(event);

      expect(await screen.findByRole("button", { name: "Xと連携する" })).toBeEnabled();
    });
  });

  describe("連携結果の表示 (backend の callback から /admin?x_connect=... で戻ってきた場合)", () => {
    it.each(["success", "denied", "error"] as const)(
      "x_connect=%s のとき、固定メッセージを表示し、URL からパラメータを消す",
      async (result) => {
        renderSection(`/admin?x_connect=${result}`);

        const notice = await screen.findByText(X_CONNECT_RESULT_MESSAGES[result].message);
        expect(notice).toBeInTheDocument();
        await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin"));
        expect(screen.getByTestId("location").textContent).not.toContain("x_connect");
      },
    );

    it("成功は status、失敗は alert として通知する (支援技術向け)", async () => {
      const { unmount } = renderSection("/admin?x_connect=success");
      expect(await screen.findByRole("status")).toHaveTextContent("連携が完了");
      unmount();

      renderSection("/admin?x_connect=error");
      expect(await screen.findByRole("alert")).toHaveTextContent("連携に失敗");
    });

    it("他のクエリは残し、x_connect だけを消す", async () => {
      renderSection("/admin?x_connect=success&page=2");

      await screen.findByText(X_CONNECT_RESULT_MESSAGES.success.message);
      await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin?page=2"));
    });

    it("未知の値は表示せず、無視する (URL の値を画面に出さない)", async () => {
      renderSection("/admin?x_connect=%3Cb%3Ehacked%3C%2Fb%3E");

      await waitFor(() => expect(screen.getByTestId("location").textContent).not.toContain("x_connect"));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(document.body.innerHTML).not.toContain("hacked");
    });

    it("パラメータが無いときは、何も表示しない", () => {
      renderSection("/admin");

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("連携を再開すると、前回の結果表示は消える", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      mockConnectResponse({ authorize_url: "https://twitter.com/i/oauth2/authorize?state=abc" });
      renderSection("/admin?x_connect=error", vi.fn());
      await screen.findByRole("alert");

      await userEvent.click(screen.getByRole("button", { name: "Xと連携する" }));

      await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    });
  });
});

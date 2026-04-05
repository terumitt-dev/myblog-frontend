// app/src/test/api/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { AuthProvider } from "@/context/AuthContext";
import { useAuthenticatedApi } from "@/api/client";

// fetch のモック
const mockFetch = vi.fn();

beforeEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// レスポンスモックのヘルパー（headers付き）
const createMockResponse = (body: any, status = 200) => {
  const make = () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    headers: {
      get: (key: string) => {
        if (key.toLowerCase() === "content-type") return "application/json";
        return null;
      },
    },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    clone: () => make(),
  });

  return make();
};

describe("認証API (useAuthenticatedApi)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <AuthProvider>{children}</AuthProvider>;
  };

  describe("authApi.signUp", () => {
    it("正常なパラメータでサインアップリクエストを送信する", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: "success", data: { id: 1, email: "test@example.com" } })
      );

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      await result.current.authApi.signUp(
        "test@example.com",
        "password123",
        "password123",
        "admin-signup-password",
      );

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain("/auth/sign_up");
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].headers).toBeInstanceOf(Headers);
      expect(callArgs[1].headers.get("Content-Type")).toBe("application/json");
      expect(callArgs[1].body).toContain("password_confirmation");
    });

    it("パスワード確認フィールドが password_confirmation として送信される", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: "success", data: {} })
      );

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      await result.current.authApi.signUp(
        "test@example.com",
        "password123",
        "password123",
        "admin-signup-password",
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.admin.password_confirmation).toBe("password123");
    });
  });

  describe("authApi.signIn", () => {
    it("正常なパラメータでログインリクエストを送信する", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: "success", data: { id: 1, email: "test@example.com" } })
      );

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      await result.current.authApi.signIn("test@example.com", "password123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/sign_in"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("リクエストボディが正しい形式である", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: "success", data: {} })
      );

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      await result.current.authApi.signIn("test@example.com", "password123");

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.admin.email).toBe("test@example.com");
      expect(body.admin.password).toBe("password123");
    });
  });

  describe("authApi.signOut", () => {
    it("ログアウトリクエストを DELETE メソッドで送信する", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: "success" })
      );

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      await result.current.authApi.signOut();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/sign_out"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });

  describe("authApi.currentUser", () => {
    it("現在のユーザー情報を取得する", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: "success", data: { id: 1, email: "test@example.com" } })
      );

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      await result.current.authApi.currentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/current_user"),
        expect.objectContaining({
          headers: expect.any(Object),
        }),
      );
    });
  });

  describe("ヘッダー処理", () => {
    it("JSON文字列のボディに Content-Type: application/json を付与する", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: "success", data: {} })
      );

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      await result.current.blogsApi.create({
        title: "Test",
        content: "Content",
        category: "tech",
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain("/admin/blogs");
      expect(callArgs[1].headers).toBeInstanceOf(Headers);
      expect(callArgs[1].headers.get("Content-Type")).toBe("application/json");
    });

    it("Accept: application/json ヘッダーをデフォルト付与する", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: "success", data: [] })
      );

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      await result.current.blogsApi.getAll();

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).toBeInstanceOf(Headers);
      expect(callArgs[1].headers.get("Accept")).toBe("application/json");
    });
  });

  describe("blogsApi.uploadImage", () => {
    it("FormDataで画像アップロードリクエストを送信する", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: "success", data: { url: "https://example.com/image.png", filename: "image.png" } })
      );

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      const file = new File(["dummy"], "test.png", { type: "image/png" });
      await result.current.blogsApi.uploadImage(file);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain("/admin/images");
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].body).toBeInstanceOf(FormData);
      expect(callArgs[1].body.get("image")).toBe(file);
    });

    it("Content-Typeヘッダーを設定しない（FormData使用時）", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: "success", data: { url: "https://example.com/image.png", filename: "image.png" } })
      );

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      const file = new File(["dummy"], "test.png", { type: "image/png" });
      await result.current.blogsApi.uploadImage(file);

      const callArgs = mockFetch.mock.calls[0];
      // FormData送信時はContent-Typeをブラウザに自動設定させるため、明示的に設定しない
      expect(callArgs[1].headers.get("Content-Type")).toBeNull();
    });
  });

  describe("レスポンス処理", () => {
    it("非JSON成功レスポンスをエラーとして返す", async () => {
      mockFetch.mockResolvedValueOnce((() => {
        const make = () => ({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: {
            get: (key: string) =>
              key.toLowerCase() === "content-type" ? "text/plain" : null,
          },
          text: async () => "plain text response",
          json: async () => {
            throw new Error("Not JSON");
          },
          clone: () => make(),
        });
        return make();
      })());

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      const response = await result.current.blogsApi.getAll();

      expect(response.ok).toBe(false);
      expect(response.error).toContain("Unexpected non-JSON response");
    });

    it("空ボディの成功レスポンス（204）を正常に処理する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: "No Content",
        headers: {
          get: () => null,
        },
        text: async () => "",
        json: async () => { throw new Error("No content"); },
        clone: function() { return this; },
      });

      const { result } = renderHook(() => useAuthenticatedApi(), { wrapper });
      const response = await result.current.blogsApi.delete(1);

      expect(response.ok).toBe(true);
      expect(response.data).toBeNull();
    });
  });
});

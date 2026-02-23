// app/src/test/api/client.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { AuthProvider } from "@/context/AuthContext";
import { useAuthenticatedApi } from "@/api/client";

// fetch のモック
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

// レスポンスモックのヘルパー（headers付き）
const createMockResponse = (body: object, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: (key: string) => {
      if (key === "Content-Type") return "application/json";
      return null;
    },
  },
  json: async () => body,
});

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
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/sign_up"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining("password_confirmation"),
        }),
      );
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
          credentials: "include",
        }),
      );
    });
  });
});

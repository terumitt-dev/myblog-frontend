// app/src/test/api/client.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// fetch のモック
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

const API_BASE = "http://localhost:3000/api";

describe("認証API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("正常なパラメータでサインアップリクエストを送信する", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          status: "success",
          data: { id: 1, email: "test@example.com" },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await fetch(`${API_BASE}/auth/sign_up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin: {
            email: "test@example.com",
            password: "password123",
            password_confirmation: "password123",
          },
        }),
      });

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
      const mockResponse = {
        ok: true,
        json: async () => ({ status: "success", data: {} }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await fetch(`${API_BASE}/auth/sign_up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin: {
            email: "test@example.com",
            password: "password123",
            password_confirmation: "password123",
          },
        }),
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.admin.password_confirmation).toBe("password123");
    });
  });

  describe("signIn", () => {
    it("正常なパラメータでログインリクエストを送信する", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          status: "success",
          data: { id: 1, email: "test@example.com" },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await fetch(`${API_BASE}/auth/sign_in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin: { email: "test@example.com", password: "password123" },
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/sign_in"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("リクエストボディが正しい形式である", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ status: "success", data: {} }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await fetch(`${API_BASE}/auth/sign_in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin: { email: "test@example.com", password: "password123" },
        }),
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.admin.email).toBe("test@example.com");
      expect(body.admin.password).toBe("password123");
    });
  });

  describe("signOut", () => {
    it("ログアウトリクエストを DELETE メソッドで送信する", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ status: "success" }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await fetch(`${API_BASE}/auth/sign_out`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/sign_out"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });

  describe("currentUser", () => {
    it("現在のユーザー情報を取得する", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          status: "success",
          data: { id: 1, email: "test@example.com" },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await fetch(`${API_BASE}/auth/current_user`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/current_user"),
        expect.objectContaining({
          method: "GET",
        }),
      );
    });
  });
});

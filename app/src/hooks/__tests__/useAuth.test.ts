// app/src/hooks/__tests__/useAuth.test.ts
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useAuth } from "../useAuth";
import { AuthProvider } from "@/context/AuthContext";
import React from "react";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children);

describe("useAuth", () => {
  beforeEach(() => {
    try {
      window.localStorage.clear();
    } catch {
      // jsdom環境でclearが使えない場合は無視
    }
  });

  it("AuthProvider内で初期状態は未認証", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it("AuthProvider外で使用するとエラーになる", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within AuthProvider");
  });

  it("login関数が存在する", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(typeof result.current.login).toBe("function");
  });

  it("logout関数が存在する", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(typeof result.current.logout).toBe("function");
  });

  it("getAuthToken関数が存在する", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(typeof result.current.getAuthToken).toBe("function");
    expect(result.current.getAuthToken()).toBeNull();
  });
});

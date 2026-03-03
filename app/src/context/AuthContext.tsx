// app/src/context/AuthContext.tsx
import { createContext, useState, useCallback } from "react";
import { API_BASE } from "@/api/client";

type LoginResult = {
  success: boolean;
  error?:
    | "network_error"
    | "invalid_credentials"
    | "token_missing";
};

type AuthContextType = {
  isLoggedIn: boolean;
  token: string | null;
  getAuthToken: () => string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // トークン取得関数
  const getAuthToken = useCallback(() => token, [token]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      // 入力値検証
      if (!email || !password) {
        return { success: false, error: "invalid_credentials" };
      }

      // メールアドレスのみ正規化（パスワードは意図的なスペースを許容）
      const normalizedEmail = email.trim();

      try {
        // Rails API経由での認証
        const response = await fetch(`${API_BASE}/auth/sign_in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin: { email: normalizedEmail, password } }),
        });

        if (!response.ok) {
          return { success: false, error: "invalid_credentials" };
        }

        let data: any = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        // Rails APIのレスポンス形式に合わせて処理
        if (data?.status === "success" && data?.data) {
          // Authorization ヘッダーからJWTを取得
          const authHeader = response.headers.get("Authorization");
          const token = authHeader?.replace(/^Bearer\s+/i, "").trim() || null;

          if (!token) {
            console.error("JWT token not found in response headers");
            return { success: false, error: "token_missing" };
          }

          setIsLoggedIn(true);
          setToken(token);
          return { success: true };
        }

        return { success: false, error: "invalid_credentials" };
      } catch (error) {
        console.error("Authentication error:", error);
        return { success: false, error: "network_error" };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      // ログアウトAPI呼び出し（トークン付き）
      if (token) {
        await fetch(`${API_BASE}/auth/sign_out`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
    } finally {
      setIsLoggedIn(false);
      setToken(null);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        token,
        getAuthToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };

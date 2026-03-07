// app/src/context/AuthContext.tsx
import { createContext, useState, useCallback } from "react";
import { API_BASE } from "@/api/base";

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
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // トークン取得関数
  const getAuthToken = useCallback(() => token, [token]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      // メールアドレスのみ正規化（パスワードは意図的なスペースを許容）
      const normalizedEmail = email.trim();

      // 入力値検証
      if (!normalizedEmail || !password) {
        return { success: false, error: "invalid_credentials" };
      }

      try {
        // Rails API経由での認証
        const base = API_BASE === "/" ? "" : API_BASE.replace(/\/$/, "");
        const response = await fetch(`${base}/auth/sign_in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin: { email: normalizedEmail, password } }),
        });

        if (!response.ok) {
          setIsLoggedIn(false);
          setToken(null);

          if (response.status === 401 || response.status === 422) {
            return { success: false, error: "invalid_credentials" };
          }
          return { success: false, error: "network_error" };
        }

        // 先に Authorization ヘッダーからJWTを取得（ボディ無し成功に備える）
        const authHeader = response.headers.get("Authorization");
        const headerToken = authHeader?.replace(/^Bearer\s+/i, "").trim() || null;

        let data: any = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        const bodyToken = typeof data?.token === "string" ? data.token : null;
        const tokenFromResponse = headerToken || bodyToken;

        // ボディが無い/形式が異なる成功レスポンスでも、トークンが取れればログイン成功にする
        if (response.ok && tokenFromResponse) {
          setIsLoggedIn(true);
          setToken(tokenFromResponse);
          return { success: true };
        }

        // Rails APIのレスポンス形式（JSON）に合わせた成功判定も残す
        if (data?.status === "success" && data?.data && tokenFromResponse) {
          setIsLoggedIn(true);
          setToken(tokenFromResponse);
          return { success: true };
        }

        if (response.ok && !tokenFromResponse) {
          // 成功扱いでもトークンが無い場合は未認証として扱い、状態をクリアする
          setIsLoggedIn(false);
          setToken(null);

          console.error(
            "JWT token not found (Authorization header may require Access-Control-Expose-Headers)",
          );
          return { success: false, error: "token_missing" };
        }

        return { success: false, error: "invalid_credentials" };
      } catch (error) {
        console.error("Authentication error:", error);
        setIsLoggedIn(false);
        setToken(null);
        return { success: false, error: "network_error" };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      // ログアウトAPI呼び出し（トークン付き）
      if (token) {
        const base = API_BASE === "/" ? "" : API_BASE.replace(/\/$/, "");
        await fetch(`${base}/auth/sign_out`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
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

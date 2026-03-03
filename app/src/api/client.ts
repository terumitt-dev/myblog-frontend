// app/src/api/client.ts
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

// APIクライアント
// 本番環境では必ずVITE_API_BASE_URLを設定すること（HTTPS必須）
const getApiBase = (): string => {
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  // 本番ビルド時は環境変数必須
  if (import.meta.env.PROD && !apiBase) {
    throw new Error('VITE_API_BASE_URL is required in production');
  }

  // 本番ビルド時は「絶対URLならHTTPS必須」。相対パス（同一オリジン想定）は許可する。
  if (import.meta.env.PROD && apiBase) {
    const isRelative = apiBase.startsWith("/");
    const isHttpsAbsolute = apiBase.startsWith("https://");
    const isHttpAbsolute = apiBase.startsWith("http://");

    if (!isRelative && !isHttpsAbsolute) {
      if (isHttpAbsolute) {
        throw new Error("VITE_API_BASE_URL must use HTTPS in production");
      }
      throw new Error("VITE_API_BASE_URL must be an absolute https URL or a relative path in production");
    }
  }

  // 開発環境ではViteプロキシ等を利用できるよう相対パスにフォールバック
  const baseUrl = apiBase || "/api";
  
  // 末尾スラッシュを除去（二重スラッシュ防止）
  return baseUrl.replace(/\/$/, "");
};

export const API_BASE = getApiBase();

// 成功時の型とエラー時の型を明確に分離
// ok プロパティで成功/失敗を明確に判別可能
export type ApiResponse<T> = 
  | { ok: true; data: T; error?: never }
  | { ok: true; data: null; error?: never }  // 空レスポンス（204など）
  | { ok: false; data?: never; error: string };

interface BlogCreateData {
  title: string;
  content: string;
  category: string;
}

interface BlogUpdateData {
  title: string;
  content: string;
  category: string;
}

interface CommentCreateData {
  user_name: string;
  comment: string;
}

interface AdminData {
  id: number;
  email: string;
  name?: string;
}

// JWTはAuthorizationヘッダーから取得するため、レスポンスボディにtokenは含まれない
interface AuthLoginResponse {
  status: string;
  message: string;
  data: AdminData;
}

// レスポンスボディが存在するか判定する
// 204 No Content は常にボディなし
// それ以外はContent-Typeをチェック（ただしエラー時はボディがある前提）
const hasJsonBody = (response: Response): boolean => {
  // 明確にボディが無い/期待できないステータス
  if (response.status === 204 || response.status === 205 || response.status === 304) {
    return false;
  }

  const contentLength = response.headers.get("Content-Length");
  if (contentLength === "0") return false;

  const contentType = response.headers.get("Content-Type");
  if (contentType && /\bjson\b/i.test(contentType)) {
    return true;
  }

  // Content-Typeが不正でもエラーレスポンスならボディがある可能性が高い
  // 安全のためJSONパース試行を許可
  return !response.ok;
};

// 認証付きfetch関数を作成するためのファクトリ関数
const createAuthenticatedApiCall = (getAuthToken: () => string | null) => {
  return async function apiCall<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    try {
      // ヘッダーの準備
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // 既存のヘッダーをマージ
      if (options?.headers) {
        const existingHeaders = options.headers;
        if (existingHeaders instanceof Headers) {
          existingHeaders.forEach((value, key) => {
            headers[key] = value;
          });
        } else if (Array.isArray(existingHeaders)) {
          existingHeaders.forEach(([key, value]) => {
            headers[key] = value;
          });
        } else {
          Object.assign(headers, existingHeaders);
        }
      }

      // 認証トークンがある場合は追加
      const token = getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      // 204 No Content や空ボディの場合は json() を呼ばない
      if (!hasJsonBody(response)) {
        const text = await response.text();

        if (!response.ok) {
          const detail = text.trim().slice(0, 500);
          return {
            ok: false,
            error: detail
              ? `API Error: ${response.status} ${response.statusText} - ${detail}`
              : `API Error: ${response.status} ${response.statusText}`,
          };
        }

        // 空ボディは成功（204等）
        if (!text.trim()) {
          return { ok: true, data: null };
        }

        // JSON の可能性がある場合のみパースし、失敗しても成功扱いで落とす
        try {
          return { ok: true, data: JSON.parse(text) as T };
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn("Non-JSON success response:", text.slice(0, 200), e);
          }
          // JSONではないが成功している場合、本文をそのまま返して情報欠落を防ぐ
          return { ok: true, data: text as unknown as T };
        }
      }

      // レスポンスボディを先にクローン（json()失敗時のtext()取得のため）
      const clonedResponse = response.clone();

      let data;
      try {
        data = await response.json();
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error("JSON Parse Error:", e);
        }

        // エラー応答時は本文を可能な限り取り込んで返す
        if (!response.ok) {
          let detail = "";
          try {
            detail = (await clonedResponse.text()).trim().slice(0, 500);
          } catch {
            // noop
          }

          return {
            ok: false,
            error: detail
              ? `API Error: ${response.status} ${response.statusText} - ${detail}`
              : `API Error: ${response.status} ${response.statusText}`,
          };
        }

        // 成功時は「本当に空」かを実体で判定し、それ以外は失敗扱いにする
        const raw = await clonedResponse.text();
        const isTrulyEmpty = response.status === 204 || !raw.trim();

        if (!isTrulyEmpty) {
          return { ok: false, error: "Invalid JSON response" };
        }

        return { ok: true, data: null };
      }

      if (!response.ok) {
        // エラーレスポンスからメッセージを抽出（無い場合でもステータスは返す）
        const msg = (data && typeof data === "object")
          ? ((data as any).message || (data as any).error || "")
          : "";

        return {
          ok: false,
          error: msg
            ? `API Error: ${response.status} ${response.statusText} - ${String(msg)}`
            : `API Error: ${response.status} ${response.statusText}`,
        };
      }

      return { ok: true, data };
    } catch (error) {
      console.error("API Error:", error);
      return { ok: false, error: "Network Error" };
    }
  };
};

// AuthContextを使用するためのhook
export const useAuthenticatedApi = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("useAuthenticatedApi must be used within AuthProvider");
  }

  const apiCall = createAuthenticatedApiCall(authContext.getAuthToken);

  return {
    // 記事関連API
    blogsApi: {
      getAll: (params?: {
        page?: number;
        limit?: number;
        category?: string;
      }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set("page", params.page.toString());
        if (params?.limit) searchParams.set("limit", params.limit.toString());
        if (params?.category) searchParams.set("category", params.category);

        const queryString = searchParams.toString();
        return apiCall(`/blogs${queryString ? `?${queryString}` : ""}`);
      },

      getById: (id: number) => apiCall(`/blogs/${id}`),

      getComments: (id: number) => apiCall(`/blogs/${id}/comments`),

      // 管理者用API（認証ヘッダー自動付与）
      create: (data: BlogCreateData) =>
        apiCall("/admin/blogs", {
          method: "POST",
          body: JSON.stringify(data),
        }),

      update: (id: number, data: BlogUpdateData) =>
        apiCall(`/admin/blogs/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),

      delete: (id: number) =>
        apiCall(`/admin/blogs/${id}`, {
          method: "DELETE",
        }),
    },

    // 認証API
    authApi: {
      signUp: (email: string, password: string, passwordConfirmation: string) =>
        apiCall<AuthLoginResponse>("/auth/sign_up", {
          method: "POST",
          body: JSON.stringify({
            admin: { email, password, password_confirmation: passwordConfirmation },
          }),
        }),

      signIn: (email: string, password: string) =>
        apiCall<AuthLoginResponse>("/auth/sign_in", {
          method: "POST",
          body: JSON.stringify({ admin: { email, password } }),
        }),

      signOut: () =>
        apiCall("/auth/sign_out", {
          method: "DELETE",
        }),

      currentUser: () => apiCall("/auth/current_user"),
    },

    // コメントAPI
    commentsApi: {
      create: (blogId: number, data: CommentCreateData) =>
        apiCall(`/blogs/${blogId}/comments`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
  };
};

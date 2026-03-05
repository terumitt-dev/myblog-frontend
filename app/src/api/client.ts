// app/src/api/client.ts
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { API_BASE } from "@/api/base";

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
          for (const [key, value] of existingHeaders) {
            headers[key] = value;
          }
        } else {
          Object.assign(headers, existingHeaders);
        }
      }

      const isAbsoluteEndpoint = /^https?:\/\//i.test(endpoint);
      const safeEndpoint = isAbsoluteEndpoint
        ? endpoint
        : endpoint.startsWith("/")
          ? endpoint
          : `/${endpoint}`;

      const base = API_BASE === "/" ? "" : API_BASE;
      const url = isAbsoluteEndpoint ? safeEndpoint : `${base}${safeEndpoint}`;

      // 認証トークンがある場合は追加（クロスオリジン絶対URLには付与しない：トークン流出対策）
      const token = getAuthToken();

      let shouldAttachAuth = !isAbsoluteEndpoint;
      if (isAbsoluteEndpoint && typeof window !== "undefined") {
        try {
          shouldAttachAuth = new URL(endpoint).origin === window.location.origin;
        } catch {
          shouldAttachAuth = false;
        }
      }

      if (token && shouldAttachAuth) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
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

        // JSON の可能性がある場合のみパースする
        try {
          return { ok: true, data: JSON.parse(text) as T };
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn("Non-JSON success response:", text.slice(0, 200), e);
          }

          // 成功時は非JSONでも本文を返して成功扱いにする（上のjson()失敗時ハンドリングと整合）
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

        // 成功時は「本当に空」かを実体で判定
        const raw = await clonedResponse.text();
        const isTrulyEmpty = response.status === 204 || !raw.trim();

        if (isTrulyEmpty) {
          return { ok: true, data: null };
        }

        // 成功時にJSONでない本文が返るケース（text/plain 等）を許容する
        return { ok: true, data: raw as unknown as T };
      }

      if (!response.ok) {
        // エラーレスポンスからメッセージを抽出（無い場合でもステータスは返す）
        const rawMsg =
          data && typeof data === "object"
            ? ((data as any).message ?? (data as any).error ?? (data as any).errors ?? "")
            : "";

        const msg =
          typeof rawMsg === "string"
            ? rawMsg
            : Array.isArray(rawMsg)
              ? rawMsg.join(", ")
              : rawMsg
                ? JSON.stringify(rawMsg)
                : "";

        return {
          ok: false,
          error: msg
            ? `API Error: ${response.status} ${response.statusText} - ${msg}`
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
      signUp: (email: string, password: string, passwordConfirmation: string, signupPassword: string) =>
        apiCall<AuthLoginResponse>("/auth/sign_up", {
          method: "POST",
          body: JSON.stringify({
            admin: { email, password, password_confirmation: passwordConfirmation },
            signup_password: signupPassword,
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

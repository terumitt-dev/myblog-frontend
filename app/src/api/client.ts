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
      const headers = new Headers(options?.headers);

      // デフォルトの Accept を付与（既存指定があれば尊重）
      if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
      }

      let body = options?.body;

      // ボディがある場合のみデフォルトの Content-Type を付与（既存指定があれば尊重）
      const hasContentType = headers.has("Content-Type");
      const hasBody = body != null;

      const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

      const isUrlEncoded =
        typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;

      // JSON を自動付与するのは「JSONとしてパースできる文字列」のみに限定（Blob等は上書きしない）
      const isStringBody = typeof body === "string";
      const bodyText = isStringBody ? (body as string) : "";

      const isParsableJsonString = (() => {
        if (!isStringBody) return false;
        try {
          JSON.parse(bodyText);
          return true;
        } catch {
          return false;
        }
      })();

      const isArrayBufferView =
        typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(body as any);

      const isReadableStream =
        typeof ReadableStream !== "undefined" && body instanceof ReadableStream;

      const isPlainObjectBody =
        body != null &&
        typeof body === "object" &&
        !isFormData &&
        !isUrlEncoded &&
        !(body instanceof Blob) &&
        !(body instanceof ArrayBuffer) &&
        !isArrayBufferView &&
        !isReadableStream &&
        (Array.isArray(body) || Object.getPrototypeOf(body) === Object.prototype);

      if (hasBody && !hasContentType && !isFormData) {
        if (isUrlEncoded) {
          headers.set(
            "Content-Type",
            "application/x-www-form-urlencoded;charset=UTF-8",
          );
        } else if (isParsableJsonString || isPlainObjectBody) {
          headers.set("Content-Type", "application/json");
        }
      }

      if (isPlainObjectBody) {
        body = JSON.stringify(body);
      }

      if (/[\\\r\n]/.test(endpoint)) {
        throw new Error("Invalid endpoint: backslashes or newlines are not allowed");
      }

      const isProtocolRelative = endpoint.startsWith("//");
      if (isProtocolRelative) {
        throw new Error("Invalid endpoint: protocol-relative URL is not allowed");
      }

      const isAbsoluteEndpoint = /^https?:\/\//i.test(endpoint);

      // 本番での平文HTTPへの誤送信を防止
      if (import.meta.env.PROD && /^http:\/\//i.test(endpoint)) {
        throw new Error("Invalid endpoint: HTTP is not allowed in production");
      }

      // 絶対URLは同一オリジンのみに制限（意図しない外部通信を防ぐ）
      if (isAbsoluteEndpoint && typeof window !== "undefined") {
        const allowedOrigin = /^https?:\/\//i.test(API_BASE)
          ? new URL(API_BASE).origin
          : window.location.origin;
        if (new URL(endpoint).origin !== allowedOrigin) {
          throw new Error("Invalid endpoint: cross-origin absolute URL is not allowed");
        }
      }

      if (!isAbsoluteEndpoint && endpoint.startsWith("?")) {
        throw new Error("Invalid endpoint: path is required before query string");
      }

      const safeEndpoint = isAbsoluteEndpoint
        ? endpoint
        : endpoint.startsWith("/")
          ? endpoint
          : `/${endpoint}`;

      const base = API_BASE === "/" ? "" : API_BASE;

      const url = (() => {
        if (isAbsoluteEndpoint) return safeEndpoint;

        // API_BASE が絶対URLの場合は URL で安全に結合（/api の二重付与を防ぐ）
        if (/^https?:\/\//i.test(base)) {
          const baseUrl = new URL(base.endsWith("/") ? base : `${base}/`);
          const basePath = baseUrl.pathname.replace(/\/+$/, "") || "/";

          // safeEndpoint にクエリ/ハッシュがあっても pathname ベースで二重付与を回避する
          const endpointUrl = new URL(safeEndpoint, baseUrl.origin);
          const endpointPathname = endpointUrl.pathname.replace(/\/+$/, "") || "/";

          // endpoint がすでに basePath 配下なら、そのまま base origin で解決して返す
          if (
            endpointPathname === basePath ||
            endpointPathname.startsWith(`${basePath}/`)
          ) {
            return endpointUrl.toString();
          }

          // baseUrl(/api/) に対して相対結合する（先頭 "/" は落とす）
          return new URL(safeEndpoint.replace(/^\//, ""), baseUrl).toString();
        }

        // 相対パスの場合は単純結合（すでに /api 付きなら尊重）
        if (!base) return safeEndpoint;

        const alreadyHasBase =
          safeEndpoint === base ||
          safeEndpoint.startsWith(`${base}/`) ||
          safeEndpoint.startsWith(`${base}?`) ||
          safeEndpoint.startsWith(`${base}#`);

        return alreadyHasBase ? safeEndpoint : `${base}${safeEndpoint}`;
      })();

      // 認証トークンがある場合は追加（設定されたAPIオリジン＆パスのときのみ：トークン流出対策）
      const token = getAuthToken();

      let shouldAttachAuth = false;
      if (typeof window !== "undefined") {
        try {
          const resolvedUrl = new URL(url, window.location.href);
          const allowedBaseUrl = /^https?:\/\//i.test(API_BASE)
            ? new URL(API_BASE)
            : new URL(API_BASE, window.location.origin);

          const allowedOrigin = allowedBaseUrl.origin;

          const allowedPath = allowedBaseUrl.pathname.replace(/\/+$/, "") || "/";
          const resolvedPath = resolvedUrl.pathname;

          const pathAllowed =
            allowedPath === "/" ? true : resolvedPath === allowedPath || resolvedPath.startsWith(`${allowedPath}/`);

          shouldAttachAuth = resolvedUrl.origin === allowedOrigin && pathAllowed;
        } catch {
          shouldAttachAuth = false;
        }
      } else {
        // SSR等: 原則付与しない（必要なら呼び出し側で同一オリジンのみ渡す）
        shouldAttachAuth = false;
      }

      if (token && shouldAttachAuth && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(url, {
        ...options,
        body,
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

          // Accept: application/json を付与しているのに非JSONが返ってきた場合はエラー
          const detail = text.trim().slice(0, 500);
          return {
            ok: false,
            error: detail
              ? `API Error: ${response.status} ${response.statusText} - Unexpected non-JSON response: ${detail}`
              : `API Error: ${response.status} ${response.statusText} - Unexpected non-JSON response`,
          };
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

        // 成功時にJSONでない本文が返るケースは異常系として扱う
        const detail = raw.trim().slice(0, 500);
        return {
          ok: false,
          error: detail
            ? `API Error: ${response.status} ${response.statusText} - Invalid JSON response: ${detail}`
            : `API Error: ${response.status} ${response.statusText} - Invalid JSON response`,
        };
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

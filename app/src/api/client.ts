// app/src/api/client.ts
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { API_BASE } from "@/api/base";
import type { CategoryKey } from "@/types";

// 成功時の型とエラー時の型を明確に分離
// ok プロパティで成功/失敗を明確に判別可能
export type ApiResponse<T> =
  | { ok: true; data: T | null; error?: never; meta?: { authToken?: string | null } }
  | { ok: false; data?: never; error: string; meta?: { authToken?: string | null } };

interface BlogCreateData {
  title: string;
  content: string;
  category: CategoryKey;
}

interface BlogUpdateData {
  title: string;
  content: string;
  category: CategoryKey;
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
  if (contentLength != null) {
    const len = Number(contentLength);
    if (Number.isFinite(len) && len <= 0) return false;
  }

  const contentType = response.headers.get("Content-Type");
  return Boolean(contentType && /\bjson\b/i.test(contentType));
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

      const method = String(options?.method ?? "GET").trim().toUpperCase();

      let body = options?.body;

      const isGetOrHead = method === "GET" || method === "HEAD";

      // GET/HEAD は body を送らない（互換性・中間機器での拒否回避）
      if (isGetOrHead && body != null) {
        throw new Error("Invalid request: GET/HEAD must not include a request body");
      }

      // GET/HEAD かつ body 無しなら Content-Type は付けない（不要なCORS preflight等を回避）
      if (isGetOrHead && headers.has("Content-Type")) {
        headers.delete("Content-Type");
      }

      const isFormData =
        typeof FormData !== "undefined" && body instanceof FormData;

      // FormData では Content-Type を指定しない（boundary をブラウザに任せる）
      if (isFormData && headers.has("Content-Type")) {
        headers.delete("Content-Type");
      }

      // ボディがある場合のみデフォルトの Content-Type を付与（既存指定があれば尊重）
      const hasContentType = headers.has("Content-Type");
      const hasBody = body != null;

      const isUrlEncoded =
        typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;

      // JSON を自動付与するのは「先頭が { または [ の文字列」のみに限定（Blob等は上書きしない）
      const isStringBody = typeof body === "string";
      const bodyText = isStringBody ? (body as string) : "";

      const looksLikeJson = isStringBody && /^\s*[\[{]/.test(bodyText);

      const isParsableJsonString = (() => {
        if (!looksLikeJson) return false;
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

      const isBlob = typeof Blob !== "undefined" && body instanceof Blob;

      const isPlainObjectBody =
        body != null &&
        typeof body === "object" &&
        !isFormData &&
        !isUrlEncoded &&
        !isBlob &&
        !(body instanceof ArrayBuffer) &&
        !isArrayBufferView &&
        !isReadableStream &&
        (() => {
          if (Array.isArray(body)) return true;
          const proto = Object.getPrototypeOf(body);
          return proto === Object.prototype || proto === null;
        })();

      const isUnsupportedPrimitiveBody =
        body != null &&
        (typeof body === "number" ||
          typeof body === "boolean" ||
          typeof body === "bigint" ||
          typeof body === "symbol" ||
          typeof body === "function");

      if (isUnsupportedPrimitiveBody) {
        throw new Error(
          "Invalid request body: unsupported primitive type (use JSON/string, FormData, URLSearchParams, Blob, ArrayBuffer, etc.)",
        );
      }

      const isUnsupportedObjectBody =
        body != null &&
        typeof body === "object" &&
        !isPlainObjectBody &&
        !isFormData &&
        !isUrlEncoded &&
        !isBlob &&
        !(body instanceof ArrayBuffer) &&
        !isArrayBufferView &&
        !isReadableStream;

      if (isUnsupportedObjectBody) {
        throw new Error(
          "Invalid request body: unsupported BodyInit type (use JSON/string, FormData, URLSearchParams, Blob, ArrayBuffer, etc.)",
        );
      }

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
        const ct = headers.get("Content-Type") ?? "";
        if (ct && !/\bjson\b/i.test(ct)) {
          throw new Error(
            "Invalid request body: plain object requires JSON Content-Type (or pass URLSearchParams/FormData/string)",
          );
        }
        body = JSON.stringify(body);
      }

      const endpointTrimmed = endpoint.trim();
      if (endpointTrimmed !== endpoint) {
        throw new Error("Invalid endpoint: leading/trailing whitespace is not allowed");
      }
      if (!endpointTrimmed) {
        throw new Error("Invalid endpoint: endpoint must not be empty");
      }
      if (endpointTrimmed.startsWith("#")) {
        throw new Error("Invalid endpoint: hash-only endpoint is not allowed");
      }

      if (/[\\\r\n]/.test(endpointTrimmed) || /%(0d|0a|5c)/i.test(endpointTrimmed)) {
        throw new Error("Invalid endpoint: backslashes or newlines are not allowed");
      }

      const isProtocolRelative = endpointTrimmed.startsWith("//");
      if (isProtocolRelative) {
        throw new Error("Invalid endpoint: protocol-relative URL is not allowed");
      }

      const isAbsoluteEndpoint = /^https?:\/\//i.test(endpointTrimmed);

      // 本番での平文HTTPへの誤送信を防止
      if (import.meta.env.PROD && /^http:\/\//i.test(endpointTrimmed)) {
        throw new Error("Invalid endpoint: HTTP is not allowed in production");
      }

      // 絶対URLは同一オリジン & API_BASE配下のみに制限（意図しない外部/別パス通信を防ぐ）
      if (isAbsoluteEndpoint) {
        const allowedBaseUrl = (() => {
          // API_BASE が絶対URLなら window が無くても判定可能
          if (/^https?:\/\//i.test(API_BASE)) return new URL(API_BASE);

          // API_BASE が相対のときはブラウザオリジンに束縛する
          if (typeof window !== "undefined") return new URL(API_BASE, window.location.origin);

          // SSR等では「許可オリジン」を確定できないため絶対URL自体を禁止
          return null;
        })();

        let parsed: URL;
        try {
          parsed = new URL(endpointTrimmed);
        } catch {
          throw new Error("Invalid endpoint: malformed absolute URL");
        }

        if (parsed.username || parsed.password) {
          throw new Error("Invalid endpoint: URL credentials are not allowed");
        }

        if (!allowedBaseUrl || parsed.origin !== allowedBaseUrl.origin) {
          throw new Error("Invalid endpoint: cross-origin absolute URL is not allowed");
        }

        const allowedPath = allowedBaseUrl.pathname.replace(/\/+$/, "") || "/";
        const pathAllowed =
          allowedPath === "/"
            ? true
            : parsed.pathname === allowedPath || parsed.pathname.startsWith(`${allowedPath}/`);

        if (!pathAllowed) {
          throw new Error("Invalid endpoint: absolute URL must be under API base path");
        }
      }

      if (!isAbsoluteEndpoint && endpointTrimmed.startsWith("?")) {
        throw new Error("Invalid endpoint: path is required before query string");
      }

      const safeEndpoint = isAbsoluteEndpoint
        ? endpointTrimmed
        : endpointTrimmed.startsWith("/")
          ? endpointTrimmed
          : `/${endpointTrimmed}`;

      // パストラバーサル/正規化による意図しない送信を防ぐ
      const pathForCheck = (() => {
        if (!isAbsoluteEndpoint) {
          // 相対URLはパス部分のみを抽出（クエリ/ハッシュは検査対象外にする）
          return safeEndpoint.split(/[?#]/, 1)[0] || "/";
        }

        // URLパーサが正規化する前のパスを文字列として抽出して検査に使う
        // 例: "https://x/api/../admin?x=1" -> "/api/../admin"
        const m = safeEndpoint.match(/^[a-z]+:\/\/[^\/]+(\/[^?#]*)/i);
        return m?.[1] ?? "/";
      })();

      const decodedPathForCheck = (() => {
        try {
          return decodeURIComponent(pathForCheck);
        } catch {
          return pathForCheck;
        }
      })();

      const hasDotSegments = (p: string) =>
        /(^|\/)\.\.(\/|$)/.test(p) || /(^|\/)\.(\/|$)/.test(p);

      // `%2e` / `%2e%2e` を含むセグメント（`%2f` は "/" 相当）
      const hasEncodedDotSegments = (p: string) =>
        /(^|\/|%2f)%2e(%2e)?(\/|%2f|$)/i.test(p);

      if (
        hasDotSegments(pathForCheck) ||
        hasDotSegments(decodedPathForCheck) ||
        hasEncodedDotSegments(pathForCheck)
      ) {
        throw new Error("Invalid endpoint: dot segments are not allowed");
      }

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

      // SSR等: Node fetch は相対URLを受け付けないことがあるためガード
      if (typeof window === "undefined" && !/^https?:\/\//i.test(url)) {
        throw new Error(
          "Invalid request in SSR: set VITE_API_BASE_URL to an absolute http(s) URL",
        );
      }

      // 認証トークンがある場合は追加（設定されたAPIオリジン＆パスのときのみ：トークン流出対策）
      const token = getAuthToken();

      const computeShouldAttachAuth = (): boolean => {
        try {
          const allowedBaseUrl = /^https?:\/\//i.test(API_BASE)
            ? new URL(API_BASE)
            : typeof window !== "undefined"
              ? new URL(API_BASE, window.location.origin)
              : null;

          // SSR等でオリジン確定できない場合は、相対URLに限り Authorization を維持する
          if (!allowedBaseUrl) {
            return !/^https?:\/\//i.test(url);
          }

          const resolvedUrl =
            typeof window !== "undefined"
              ? new URL(url, window.location.href)
              : new URL(url, allowedBaseUrl);

          const allowedPath = allowedBaseUrl.pathname.replace(/\/+$/, "") || "/";
          const resolvedPath = resolvedUrl.pathname;

          const pathAllowed =
            allowedPath === "/"
              ? true
              : resolvedPath === allowedPath || resolvedPath.startsWith(`${allowedPath}/`);

          return resolvedUrl.origin === allowedBaseUrl.origin && pathAllowed;
        } catch {
          return false;
        }
      };

      const shouldAttachAuth = computeShouldAttachAuth();

      // 許可されない送信先には Authorization を載せない（options由来も含めて削除）
      if (!shouldAttachAuth && headers.has("Authorization")) {
        headers.delete("Authorization");
      }
      if (token && shouldAttachAuth) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(url, {
        ...options,
        method,
        body,
        headers,
      });

      const authHeader = response.headers.get("Authorization")?.trim() ?? "";
      const m = authHeader.match(/^Bearer\s+(.+)$/i);
      const authToken = m ? m[1].trim() : null;

      // 204 No Content や空ボディの場合は json() を呼ばない
      if (!hasJsonBody(response)) {
        const text = await response.text();

        if (!response.ok) {
          let detail = text.trim();

          // Content-Typeが非JSONでも、本文がJSONならメッセージ抽出を試みる
          if (detail && /^\s*[\[{]/.test(detail)) {
            try {
              const parsed = JSON.parse(detail) as any;
              const msg = parsed?.message ?? parsed?.error ?? parsed?.errors;
              if (typeof msg === "string") detail = msg;
              else if (Array.isArray(msg)) detail = msg.join(", ");
              else if (msg != null) detail = String(msg);
            } catch {
              // noop
            }
          }

          const clipped = detail.slice(0, 500);
          return {
            ok: false,
            error: clipped
              ? `API Error: ${response.status} ${response.statusText} - ${clipped}`
              : `API Error: ${response.status} ${response.statusText}`,
            meta: { authToken },
          };
        }

        // 空ボディは成功（204等）
        if (!text.trim()) {
          return { ok: true, data: null, meta: { authToken } };
        }

        const accept = headers.get("Accept") ?? "";
        const expectsJson = /\bjson\b/i.test(accept) || accept === "";

        // JSON を期待する場合のみパース失敗をエラー化する
        try {
          return { ok: true, data: JSON.parse(text) as T, meta: { authToken } };
        } catch (e) {
          if (!expectsJson) {
            return { ok: true, data: text as unknown as T, meta: { authToken } };
          }

          if (import.meta.env.DEV) {
            console.warn("Non-JSON success response:", text.slice(0, 200), e);
          }

          const detail = text.trim().slice(0, 500);
          return {
            ok: false,
            error: detail
              ? `API Error: ${response.status} ${response.statusText} - Unexpected non-JSON response: ${detail}`
              : `API Error: ${response.status} ${response.statusText} - Unexpected non-JSON response`,
            meta: { authToken },
          };
        }
      }

      // レスポンスボディを先にクローン（json()失敗時のtext()取得のため）
      let clonedResponse: Response | null = null;
      try {
        clonedResponse = response.clone();
      } catch {
        clonedResponse = null;
      }

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
          if (clonedResponse) {
            try {
              detail = (await clonedResponse.text()).trim().slice(0, 500);
            } catch {
              // noop
            }
          }

          return {
            ok: false,
            error: detail
              ? `API Error: ${response.status} ${response.statusText} - ${detail}`
              : `API Error: ${response.status} ${response.statusText}`,
            meta: { authToken },
          };
        }

        // 成功時は「本当に空」かを実体で判定（clone不可なら詳細判定は最小限にする）
        let raw = "";
        if (clonedResponse) {
          try {
            raw = await clonedResponse.text();
          } catch {
            raw = "";
          }
        }
        const isTrulyEmpty = response.status === 204 || !raw.trim();

        if (isTrulyEmpty) {
          return { ok: true, data: null, meta: { authToken } };
        }

        // 成功時にJSONでない本文が返るケースは異常系として扱う
        const detail = raw.trim().slice(0, 500);
        return {
          ok: false,
          error: detail
            ? `API Error: ${response.status} ${response.statusText} - Invalid JSON response: ${detail}`
            : `API Error: ${response.status} ${response.statusText} - Invalid JSON response`,
          meta: { authToken },
        };
      }

      if (!response.ok) {
        // エラーレスポンスからメッセージを抽出（無い場合でもステータスは返す）
        const rawMsg =
          data && typeof data === "object"
            ? ((data as any).message ?? (data as any).error ?? (data as any).errors ?? data)
            : data;

        const safeStringify = (v: unknown): string => {
          try {
            return JSON.stringify(v);
          } catch {
            try {
              return String(v);
            } catch {
              return "";
            }
          }
        };

        const msg =
          typeof rawMsg === "string"
            ? rawMsg
            : Array.isArray(rawMsg)
              ? rawMsg.join(", ")
              : rawMsg
                ? safeStringify(rawMsg)
                : "";

        const trimmedMsg = msg.trim().slice(0, 500);

        return {
          ok: false,
          error: trimmedMsg
            ? `API Error: ${response.status} ${response.statusText} - ${trimmedMsg}`
            : `API Error: ${response.status} ${response.statusText}`,
          meta: { authToken },
        };
      }

      return { ok: true, data, meta: { authToken } };
    } catch (error) {
      console.error("API Error:", error);

      const message =
        error instanceof Error
          ? (import.meta.env.DEV ? error.message : "Network Error")
          : "Network Error";

      return { ok: false, error: message, meta: { authToken: null } };
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

      importMt: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return apiCall("/admin/blogs/import_mt", {
          method: "POST",
          body: formData,
        });
      },

      uploadImage: (file: File) => {
        const formData = new FormData();
        formData.append("image", file);
        return apiCall<{ url: string; filename: string }>("/admin/images", {
          method: "POST",
          body: formData,
        });
      },
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
          body: JSON.stringify({ comment: data }),
        }),
    },
  };
};

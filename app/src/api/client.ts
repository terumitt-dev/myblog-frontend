// app/src/api/client.ts
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

// APIクライアント
// 本番環境では必ずVITE_API_BASE_URLを設定すること
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

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
  name: string;
}

interface AuthLoginResponse {
  admin: AdminData;
  token: string;
}

// レスポンスボディが存在するか判定する
const hasJsonBody = (response: Response): boolean => {
  if (response.status === 204) return false;
  const contentType = response.headers.get("Content-Type");
  return contentType !== null && contentType.includes("application/json");
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
        if (!response.ok) {
          return { error: "API Error" };
        }
        return { data: undefined };
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error("JSON Parse Error:", e);
        return { error: "Invalid JSON response" };
      }

      if (!response.ok) {
        return { error: data.message || "API Error" };
      }

      return { data };
    } catch (error) {
      console.error("API Error:", error);
      return { error: "Network Error" };
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

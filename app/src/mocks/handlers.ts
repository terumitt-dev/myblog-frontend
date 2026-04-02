// app/src/mocks/handlers.ts
import { http, HttpResponse } from "msw";
import type { Blog, Comment, CategoryKey } from "@/types";

const API_BASE = "/api";

// カテゴリ名マッピング（フロントエンドの期待値に合わせる）
const CATEGORY_NAMES: Record<CategoryKey, string> = {
  hobby: "hobby",
  tech: "tech",
  other: "other",
  uncategorized: "uncategorized",
};

// モックデータ（開発環境用）
const createInitialBlogs = (): Blog[] => [
  {
    id: 1,
    title: "React 19の新機能について",
    content: "React 19がリリースされ、多くの新機能が追加されました。",
    category: "tech",
    created_at: "2024-12-14T15:30:00.000Z",
    updated_at: "2024-12-15T10:00:00.000Z",
  },
  {
    id: 2,
    title: "TypeScript 5.3の型推論改善",
    content: "TypeScript 5.3で型推論がさらに強化されました。",
    category: "tech",
    created_at: "2024-12-13T14:20:00.000Z",
    updated_at: "2024-12-14T09:30:00.000Z",
  },
  {
    id: 3,
    title: "週末の登山記録",
    content: "週末に近くの山に登ってきました。天気も良く最高でした。",
    category: "hobby",
    created_at: "2024-12-12T18:45:00.000Z",
    updated_at: "2024-12-13T08:15:00.000Z",
  },
];

const createInitialComments = (): Comment[] => [
  {
    id: 1,
    blog_id: 1,
    user_name: "山田太郎",
    comment: "とても参考になりました！",
    created_at: "2024-12-15T12:00:00.000Z",
    updated_at: "2024-12-15T12:00:00.000Z",
  },
  {
    id: 2,
    blog_id: 1,
    user_name: "佐藤花子",
    comment: "Server Componentsについてもっと知りたいです。",
    created_at: "2024-12-15T13:30:00.000Z",
    updated_at: "2024-12-15T13:30:00.000Z",
  },
];

let blogs: Blog[] = createInitialBlogs();
let comments: Comment[] = createInitialComments();

let nextBlogId = Math.max(0, ...blogs.map((b) => b.id)) + 1;
let nextCommentId = Math.max(0, ...comments.map((c) => c.id)) + 1;

export const allocateBlogId = () => nextBlogId++;
export const allocateCommentId = () => nextCommentId++;

// セッションスコープでの一貫トークン管理（テスト対応版）
let sessionToken: string | null = null;

export const resetMockData = () => {
  blogs = createInitialBlogs();
  comments = createInitialComments();
  nextBlogId = Math.max(0, ...blogs.map((b) => b.id)) + 1;
  nextCommentId = Math.max(0, ...comments.map((c) => c.id)) + 1;
  sessionToken = null;
};

const getDevToken = (): string => {
  const envToken = import.meta.env.VITE_DEV_AUTH_TOKEN;
  if (envToken) {
    return envToken; // 環境変数優先
  }

  // テスト環境では固定値を使用（再現性確保）
  if (import.meta.env.MODE === "test" || import.meta.env.VITEST === "true") {
    return "test-token-fixed";
  }

  // 開発環境のみセッション生成
  if (!sessionToken) {
    sessionToken = `dev-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.warn("⚠️ VITE_DEV_AUTH_TOKEN not set, generated session token");
  }

  return sessionToken;
};

// 認証チェック関数（安全な本番検出 + typeof windowガード版）
const requireAuth = (request: Request) => {
  // 第1段階: 厳密なビルドフラグによる本番環境検出
  if (import.meta.env.PROD || import.meta.env.MODE === "production") {
    console.error("🚫 MSW Handler: MSW detected in production environment!");
    return HttpResponse.json(
      { message: "This API is not available in production" },
      { status: 503 },
    );
  }

  // 第2段階: 安全なwindow参照による追加チェック
  if (typeof window !== "undefined") {
    try {
      const isHTTPS = window.location.protocol === "https:";
      const isNotLocalhost =
        !window.location.hostname.includes("localhost") &&
        !window.location.hostname.includes("127.0.0.1") &&
        !window.location.hostname.includes("local");

      if (isHTTPS && isNotLocalhost) {
        console.error("🚫 MSW Handler: Production-like environment detected!");
        return HttpResponse.json(
          {
            message:
              "This API is not available in production-like environments",
          },
          { status: 503 },
        );
      }
    } catch (error) {
      // window.location アクセスエラー時は安全側に倒す
      console.warn(
        "⚠️ MSW Handler: Cannot access window.location, assuming safe environment",
        error,
      );
    }
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return HttpResponse.json({ message: "認証が必要です" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const devToken = getDevToken();

  if (token !== devToken) {
    return HttpResponse.json(
      { message: "無効なトークンです" },
      { status: 401 },
    );
  }

  return null; // 認証成功
};

// ブログ一覧取得の共通ロジック
const getBlogsLogic = (request: Request) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);
  const category = url.searchParams.get("category");

  let filteredBlogs = blogs;

  // カテゴリフィルター（数値と文字列の両方に対応）
  if (category) {
    let categoryKey: CategoryKey | null = null;

    // カテゴリが数値文字列の場合（例: "0", "1", "2"）
    if (/^\d+$/.test(category)) {
      const numericCategory = parseInt(category, 10);
      const numToCategoryMap: Record<number, CategoryKey> = { 0: "hobby", 1: "tech", 2: "other" };
      if (numericCategory in numToCategoryMap) {
        categoryKey = numToCategoryMap[numericCategory];
      }
    }
    // カテゴリが名前文字列の場合（例: "hobby", "tech", "other"）
    else if (["hobby", "tech", "other", "uncategorized"].includes(category)) {
      categoryKey = category as CategoryKey;
    }

    // 有効なカテゴリキーでフィルタリング
    if (categoryKey !== null) {
      filteredBlogs = blogs.filter(
        (blog: Blog) => blog.category === categoryKey,
      );
    }
  }

  // ページネーション
  const total = filteredBlogs.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedBlogs = filteredBlogs.slice(start, end);

  // レスポンス形式を調整（category_nameを追加）
  const blogsWithCategoryName = paginatedBlogs.map((blog: Blog) => ({
    ...blog,
    category_name: CATEGORY_NAMES[blog.category],
  }));

  const responseData = {
    blogs: blogsWithCategoryName,
    pagination: {
      current_page: page,
      per_page: limit,
      total_pages: totalPages,
      total_count: total,
    },
    // 後方互換性のために追加
    total: total,
  };

  return HttpResponse.json(responseData, {
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const handlers = [
  // ========== ブログ関連API ==========

  // ブログ記事一覧取得
  http.get(`${API_BASE}/blogs`, ({ request }) => {
    return getBlogsLogic(request);
  }),

  // ブログ記事詳細取得
  http.get(`${API_BASE}/blogs/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);

    const blog = blogs.find((b: Blog) => b.id === id);
    if (!blog) {
      return HttpResponse.json({ message: "Blog not found" }, { status: 404 });
    }

    const responseData = {
      ...blog,
      category_name: CATEGORY_NAMES[blog.category],
    };

    return HttpResponse.json(responseData);
  }),

  // ブログ記事のコメント一覧取得
  http.get(`${API_BASE}/blogs/:id/comments`, ({ params }) => {
    const blogId = parseInt(params.id as string, 10);

    const blogComments = comments.filter(
      (comment: Comment) => comment.blog_id === blogId,
    );

    return HttpResponse.json({ comments: blogComments });
  }),

  // コメント投稿
  http.post(`${API_BASE}/blogs/:id/comments`, async ({ params, request }) => {
    const blogId = parseInt(params.id as string, 10);
    const body = (await request.json()) as {
      user_name: string;
      comment: string;
    };

    const newComment: Comment = {
      id: Date.now(),
      blog_id: blogId,
      user_name: body.user_name,
      comment: body.comment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // メモリ内のcomments配列に追加
    comments.push(newComment);

    return HttpResponse.json(newComment, { status: 201 });
  }),

  // ========== 認証関連API ==========

  // ログイン
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      password: string;
    };

    // 開発環境用の簡易認証
    if (body.email === "admin@example.com" && body.password === "password") {
      const responseData = {
        token: getDevToken(), // テスト対応済みトークン使用
        admin: {
          id: 1,
          email: "admin@example.com",
          name: "管理者",
        },
      };

      return HttpResponse.json(responseData);
    } else {
      return HttpResponse.json(
        { message: "メールアドレスまたはパスワードが間違っています" },
        { status: 401 },
      );
    }
  }),

  // ログアウト
  http.post(`${API_BASE}/auth/logout`, async ({ request }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    return HttpResponse.json({ message: "ログアウトしました" });
  }),

  // 認証確認
  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const adminData = {
      id: 1,
      email: "admin@example.com",
      name: "管理者",
    };

    return HttpResponse.json(adminData);
  }),

  // ========== 管理者用API ==========

  // 管理者用ブログ投稿作成
  http.post(`${API_BASE}/admin/blogs`, async ({ request }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    try {
      const body = (await request.json()) as {
        title: string;
        content: string;
        category: CategoryKey | number | string;
      };

      // カテゴリ正規化（数値・数値文字列・文字列に対応、GETフィルタと同じロジック）
      const validCategories: CategoryKey[] = ["hobby", "tech", "other", "uncategorized"];
      const numToCategoryMap: Record<number, CategoryKey> = { 0: "hobby", 1: "tech", 2: "other" };
      let normalizedCategory: CategoryKey | undefined;
      if (typeof body.category === "number") {
        normalizedCategory = numToCategoryMap[body.category];
      } else if (typeof body.category === "string" && /^\d+$/.test(body.category)) {
        normalizedCategory = numToCategoryMap[parseInt(body.category, 10)];
      } else {
        normalizedCategory = body.category as CategoryKey;
      }

      if (!body.title || !body.content || !normalizedCategory || !validCategories.includes(normalizedCategory)) {
        return HttpResponse.json(
          { message: "必要な項目が不足しています" },
          { status: 400 },
        );
      }

      const newBlog: Blog = {
        id: Date.now(),
        title: body.title,
        content: body.content,
        category: normalizedCategory as CategoryKey,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // メモリ内のblogs配列の先頭に追加
      blogs.unshift(newBlog);

      return HttpResponse.json(newBlog, { status: 201 });
    } catch {
      return HttpResponse.json(
        { message: "投稿の作成に失敗しました" },
        { status: 500 },
      );
    }
  }),

  // 管理者用ブログ投稿更新
  http.put(`${API_BASE}/admin/blogs/:id`, async ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const id = parseInt(params.id as string, 10);
    const body = (await request.json()) as Partial<Blog>;

    // 実際にblogs配列を更新
    const blogIndex = blogs.findIndex((blog: Blog) => blog.id === id);
    if (blogIndex === -1) {
      return HttpResponse.json(
        { message: "投稿が見つかりません" },
        { status: 404 },
      );
    }

    // 既存のブログを更新
    blogs[blogIndex] = {
      ...blogs[blogIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(blogs[blogIndex]);
  }),

  // 管理者用ブログ投稿削除
  http.delete(`${API_BASE}/admin/blogs/:id`, async ({ request, params }) => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const id = parseInt(params.id as string, 10);

    // 実際にblogs配列から削除
    const blogIndex = blogs.findIndex((blog: Blog) => blog.id === id);
    if (blogIndex === -1) {
      return HttpResponse.json(
        { message: "投稿が見つかりません" },
        { status: 404 },
      );
    }

    // blogs配列から削除
    const deletedBlog = blogs.splice(blogIndex, 1)[0];

    return HttpResponse.json(
      { message: "投稿を削除しました", blog: deletedBlog },
      { status: 200 },
    );
  }),

  // ========== 後方互換性 ==========

  // 古い /articles エンドポイント（共通ロジック使用）
  http.get(`${API_BASE}/articles`, ({ request }) => {
    return getBlogsLogic(request);
  }),
];

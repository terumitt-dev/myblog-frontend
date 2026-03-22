// app/src/hooks/usePosts.ts
import { useState, useEffect } from "react";
import { API_BASE } from "@/api/base";

// MSWレスポンス用の型定義
interface BlogFromAPI {
  id: number;
  title: string;
  content: string;
  category: number;
  category_name: string;
  created_at: string;
  updated_at: string;
}

interface BlogsAPIResponse {
  blogs: BlogFromAPI[];
}

export type Post = {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  category: number;
  category_name: string;
  tags: string[];
  author: string;
  authorId: number;
  featuredImage?: string;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
};

/**
 * 投稿データ管理フック - Rails Blog モデル対応版
 */
export const usePosts = (category?: string) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadPosts = async () => {
      try {
        // APIパラメータの構築
        const params = new URLSearchParams();
        if (category) {
          params.set("category", category);
        }
        params.set("limit", "20"); // 最大20件取得

        const queryString = params.toString();
        const url = `${API_BASE}/blogs${queryString ? `?${queryString}` : ""}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: BlogsAPIResponse = await response.json();

        if (isMounted) {
          // MSWからのレスポンス（Blog）をPost型に変換
          const mappedPosts: Post[] = data.blogs.map((blog: BlogFromAPI) => ({
            id: blog.id,
            title: blog.title,
            content: blog.content,
            excerpt: blog.content.substring(0, 150) + "...", // contentの最初の150文字を抜粋として使用
            slug: blog.id.toString(), // Rails側にslugがないのでidを使用
            category: blog.category,
            category_name: blog.category_name,
            tags: [], // Rails側にtagsがないので空配列
            author: "Admin", // Rails側にauthorがないので固定値
            authorId: 1,
            featuredImage: undefined, // Rails側にfeatured_imageがないのでundefined
            published: true, // 全て公開済みとして扱う
            publishedAt: blog.created_at,
            createdAt: blog.created_at,
            updatedAt: blog.updated_at,
            commentsCount: 0, // 後でコメント数を取得するか、0で初期化
          }));

          setPosts(mappedPosts);
        }
      } catch (e) {
        if (isMounted) {
          console.error("Failed to load posts:", e);
          setError(e instanceof Error ? e.message : "Unknown error");
          setPosts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, [category]);

  return { posts, isLoading, error };
};

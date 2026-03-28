// app/src/pages/Top.tsx
import { useState, useEffect } from "react";
import Layout from "@/components/layouts/Layout";
import { Link } from "react-router-dom";
import CategoryButtons from "@/components/organisms/CategoryButtons";
import ArticleSkeleton from "@/components/molecules/ArticleSkeleton";
import Container from "@/components/layouts/Container";
import { cn } from "@/components/utils/cn";
import type { BlogWithCategoryName } from "@/types";
import { getReadMoreButtonStyle, CATEGORY_COLORS } from "@/components/utils/colors";
import { stripHtmlTags } from "@/components/utils/sanitizer";
import { API_BASE } from "@/api/base";

const Top = () => {
  const [posts, setPosts] = useState<BlogWithCategoryName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // APIからダミーデータを読み込み
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/blogs`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 最新6件を取得
        const latestPosts = data.blogs
          .sort(
            (a: BlogWithCategoryName, b: BlogWithCategoryName) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )
          .slice(0, 6);

        setPosts(latestPosts);
        console.log("Topページ: 投稿データを読み込み", latestPosts);
      } catch (e) {
        console.error("投稿の読み込みに失敗しました:", e);
        setError("投稿の読み込みに失敗しました");
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

  // カテゴリ名の変換
  const getCategoryDisplayName = (categoryName: string) => {
    switch (categoryName) {
      case "tech":
        return "テック";
      case "hobby":
        return "しゅみ";
      case "other":
        return "その他";
      case "uncategorized":
        return "未分類";
      default:
        return categoryName;
    }
  };

  // カテゴリの色クラス
  const getCategoryColorClass = (categoryName: string) => {
    const colors = CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS];
    return colors ? colors.bg : CATEGORY_COLORS.other.bg;
  };

  return (
    <Layout>
      <Container size="wide" padding="section" className="space-y-8">
        {/* メインタイトル（スクリーンリーダー用） */}
        <h1 id="page-title" className="sr-only">
          My Blog - ホームページ
        </h1>

        {/* ヒーロー画像 */}
        <section aria-label="ブログのメインビジュアル">
          <div className="w-full overflow-hidden rounded-xl">
            <img
              src="/top.svg"
              alt="このブログのイメージを表すトップ画像"
              className="w-full h-auto object-cover"
              onError={(e) => {
                // 画像が見つからない場合のフォールバック
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>
        </section>

        {/* カテゴリナビゲーション */}
        <nav aria-label="記事カテゴリー" className="space-y-3">
          <h2 className="sr-only">カテゴリー一覧</h2>
          <CategoryButtons fullWidth />
        </nav>

        {/* 最新記事セクション */}
        <section
          className="space-y-6"
          aria-labelledby="latest-articles-heading"
        >
          <div
            className={cn(
              "bg-white dark:bg-gray-800 rounded-xl shadow-lg",
              "p-6 sm:p-8",
              "border border-gray-200 dark:border-gray-700",
            )}
          >
            <h2
              id="latest-articles-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white"
            >
              最新記事
            </h2>

            {error ? (
              <div
                className="text-center p-8"
                role="alert"
                aria-live="assertive"
              >
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                  <div className="flex justify-center mb-4">
                    <svg
                      className="h-12 w-12 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                    記事の読み込みに失敗しました
                  </h3>
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
            ) : isLoading ? (
              <ArticleSkeleton count={6} />
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    まだ投稿がありません
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    最初の記事を投稿してみましょう！
                  </p>
                  <Link
                    to="/admin"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    管理画面へ
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            getCategoryColorClass(post.category),
                          )}
                        >
                          {getCategoryDisplayName(post.category_name)}
                        </span>
                        <time
                          dateTime={post.created_at}
                          className="text-xs text-gray-500 dark:text-gray-400"
                        >
                          {new Date(post.created_at).toLocaleDateString(
                            "ja-JP",
                          )}
                        </time>
                      </div>

                      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white line-clamp-2">
                        {post.title}
                      </h3>

                      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">
                        {(() => {
                          const text = stripHtmlTags(post.content);
                          return text.length > 100 ? text.substring(0, 100) + "..." : text;
                        })()}
                      </p>

                      <Link
                        to={`/posts/${post.id}`}
                        className={getReadMoreButtonStyle("sm")}
                      >
                        続きを読む
                        <svg
                          className="ml-2 w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </Container>
    </Layout>
  );
};

export default Top;

// app/src/pages/Category.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { TEXT_LIMITS } from "@/constants/appConfig";
import { CATEGORY_COLORS } from "@/components/utils/colors";
import BackToHomeButton from "@/components/molecules/BackToHomeButton";
import { cn } from "@/components/utils/cn";
import ThemeToggle from "@/components/molecules/ThemeToggle";
import ArticleSkeleton from "@/components/molecules/ArticleSkeleton";
import { useStaticEffects } from "@/hooks/useStaticEffects";
import type { BlogWithCategoryName } from "@/types";
import "./Category.css";
import { getReadMoreButtonStyle } from "@/components/utils/colors";
import { API_BASE } from "@/api/base";

const Category = () => {
  const { category } = useParams<{ category: string }>();

  // 状態管理
  const [posts, setPosts] = useState<BlogWithCategoryName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Page Visibility監視
  const [isPageVisible, setIsPageVisible] = useState(() => {
    if (typeof document === "undefined") return true;
    return !document.hidden;
  });

  // 本格的なエフェクトフックを使用
  const {
    spiders,
    snails,
    reducedMotion,
    spiderDisappearingIds,
    snailDisappearingIds,
    handleSpiderClick,
    handleSnailClick,
    isValidCategory,
  } = useStaticEffects(category);

  // 泡エフェクトの動的管理
  const [bubbles, setBubbles] = useState<
    Array<{
      id: number;
      left: string;
      top: string;
      delay: number;
    }>
  >([]);

  // カタツムリの移動状態管理
  const [movingSnails, setMovingSnails] = useState<Set<number>>(new Set());

  // カテゴリ設定（useMemoで最適化）
  const categoryConfig = React.useMemo(() => {
    if (!category) return null;

    const configs = {
      hobby: {
        name: "しゅみ",
        colors: CATEGORY_COLORS.hobby,
        backgroundColor: CATEGORY_COLORS.hobby.hex, // #E1C6F9
      },
      tech: {
        name: "テック",
        colors: CATEGORY_COLORS.tech,
        backgroundColor: CATEGORY_COLORS.tech.hex, // #AFEBFF
      },
      other: {
        name: "その他",
        colors: CATEGORY_COLORS.other,
        backgroundColor: CATEGORY_COLORS.other.hex, // #CCF5B1
      },
    };

    return configs[category as keyof typeof configs] || null;
  }, [category]);

  // Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 泡の生成と管理
  useEffect(() => {
    if (category !== "tech" || !isPageVisible || reducedMotion) {
      setBubbles([]);
      return;
    }

    const generateBubble = () => {
      const newBubble = {
        id: Date.now() + Math.random(),
        left: `${Math.random() * 80 + 10}%`,
        top: `${Math.random() * 80 + 10}%`,
        delay: Math.random() * 1000,
      };

      setBubbles((prev) => [...prev, newBubble]);

      // 3秒後に泡を削除（アニメーション完了後）
      setTimeout(() => {
        setBubbles((prev) =>
          prev.filter((bubble) => bubble.id !== newBubble.id),
        );
      }, 3000);
    };

    // 初期泡を生成（少し間隔をあけて）
    for (let i = 0; i < 3; i++) {
      setTimeout(generateBubble, i * 600);
    }

    // 1.2秒間隔で新しい泡を生成
    const bubbleInterval = setInterval(generateBubble, 1200);

    return () => {
      clearInterval(bubbleInterval);
      setBubbles([]);
    };
  }, [category, isPageVisible, reducedMotion]);

  // 投稿データ読み込み（MSW APIを使用）
  const loadPosts = useCallback(async () => {
    if (!category) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!["hobby", "tech", "other", "uncategorized"].includes(category)) {
        throw new Error("無効なカテゴリです");
      }

      // カテゴリフィルター付きでAPIを呼び出し
      const response = await fetch(`${API_BASE}/blogs?category=${encodeURIComponent(category)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // レスポンスデータを日付順でソート
      const sortedPosts = data.blogs.sort(
        (a: BlogWithCategoryName, b: BlogWithCategoryName) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setPosts(sortedPosts);
      console.log(`${category}カテゴリの投稿を読み込み:`, sortedPosts);
    } catch (err) {
      console.error("投稿読み込みエラー:", err);
      setError(
        err instanceof Error ? err.message : "投稿の読み込みに失敗しました",
      );
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    if (!category || !categoryConfig) return;

    loadPosts();
  }, [category, categoryConfig]);

  // カタツムリのホバーハンドラ
  const handleSnailHover = useCallback(
    (snailId: number) => {
      if (movingSnails.has(snailId)) return;

      console.log(`カタツムリ ${snailId} がホバーされました`);
      setMovingSnails((prev) => new Set([...prev, snailId]));

      // 15秒後に移動状態をリセット（アニメーション完了後）
      setTimeout(() => {
        setMovingSnails((prev) => {
          const newSet = new Set(prev);
          newSet.delete(snailId);
          return newSet;
        });
      }, 15000);
    },
    [movingSnails],
  );

  // 本格的なエフェクトレンダリング関数
  const renderSpiderLayer = () => {
    if (category !== "hobby" || !isPageVisible || reducedMotion) return null;

    return (
      <div className="spider-container fixed inset-0 pointer-events-none z-1">
        {spiders.map((spider) => (
          <div
            key={spider.id}
            className={cn(
              "spider",
              `rotate-${spider.rotate}`,
              spiderDisappearingIds.has(spider.id) ? "spider-disappear" : "",
            )}
            style={{
              top: spider.top,
              left: spider.left,
              pointerEvents: "auto",
            }}
            onClick={() => handleSpiderClick(spider.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSpiderClick(spider.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`蜘蛛 ${spider.id}番をクリックして消去`}
          >
            <span
              className="spider-rotator"
              style={
                { "--rotation": `${spider.rotate}deg` } as React.CSSProperties
              }
            >
              <img
                src="/patterns/spider.svg"
                alt=""
                className="w-full h-full object-contain"
              />
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderBubbleLayer = () => {
    if (category !== "tech" || !isPageVisible || reducedMotion) return null;

    return (
      <div className="bubble-container fixed inset-0 pointer-events-none z-1">
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className="bubble"
            style={{
              left: bubble.left,
              top: bubble.top,
              animationDelay: `${bubble.delay}ms`,
            }}
          >
            <img
              src="/patterns/bubbles.svg"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderSnailLayer = () => {
    if (category !== "other" || !isPageVisible || reducedMotion) return null;

    return (
      <div className="snail-container fixed inset-0 pointer-events-none z-1">
        {snails.map((snail) => (
          <div
            key={snail.id}
            className={cn(
              "snail",
              movingSnails.has(snail.id) ? "snail-move" : "",
              snailDisappearingIds.has(snail.id) ? "snail-disappear" : "",
            )}
            style={
              {
                top: snail.top,
                left: snail.left,
                pointerEvents: "auto",
                "--snail-shift-x": "-120px",
              } as React.CSSProperties
            }
            onClick={() => handleSnailClick(snail.id)}
            onMouseEnter={() => handleSnailHover(snail.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSnailClick(snail.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`カタツムリ ${snail.id}番をクリックして消去`}
          >
            <img
              src="/patterns/snail.svg"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        ))}
      </div>
    );
  };

  // エラーハンドリング：無効なカテゴリの場合
  if (!category || !categoryConfig || !isValidCategory) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <header className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-2 z-10">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">My Blog</h1>
          <ThemeToggle />
        </header>
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200">
            無効なカテゴリです
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            有効なカテゴリ: hobby, tech, other
          </p>
          <BackToHomeButton className="mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: categoryConfig.backgroundColor }}
    >
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-2 relative z-20">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-200">
          My Blog
        </h1>
        <ThemeToggle />
      </header>

      {/* 本格的なエフェクトレイヤー */}
      {renderSpiderLayer()}
      {renderBubbleLayer()}
      {renderSnailLayer()}

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            {categoryConfig.name}のページ
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isLoading
              ? "読み込み中..."
              : error
                ? "エラーが発生しました"
                : posts.length > 0
                  ? `${posts.length}件の投稿があります`
                  : "まだ投稿がありません"}
          </p>
          <BackToHomeButton />
        </div>

        {/* アクセシビリティ情報 */}
        {!reducedMotion && (
          <div className="sr-only" aria-live="polite">
            {category === "hobby" &&
              "しゅみページでは蜘蛛のエフェクトが表示されています"}
            {category === "tech" &&
              "テックページでは泡のエフェクトが表示されています"}
            {category === "other" &&
              "その他ページではカタツムリのエフェクトが表示されています"}
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mb-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
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
                エラーが発生しました
              </h3>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={() => loadPosts()}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                再試行
              </button>
            </div>
          </div>
        )}

        {/* 投稿一覧 */}
        {isLoading ? (
          <ArticleSkeleton count={6} />
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        CATEGORY_COLORS[post.category as keyof typeof CATEGORY_COLORS]?.bg || CATEGORY_COLORS.other.bg,
                      )}
                    >
                      {categoryConfig.name}
                    </span>
                    <time
                      dateTime={post.created_at}
                      className="text-xs text-gray-500 dark:text-gray-400"
                    >
                      {new Date(post.created_at).toLocaleDateString("ja-JP")}
                    </time>
                  </div>

                  <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold break-words mb-2 text-gray-900 dark:text-white">
                    {post.title}
                  </h2>

                  <div className="text-gray-700 dark:text-gray-300 line-clamp-3 mb-4">
                    {post.content.length > TEXT_LIMITS.PREVIEW_LENGTH
                      ? post.content.substring(0, TEXT_LIMITS.PREVIEW_LENGTH) +
                        "..."
                      : post.content}
                  </div>

                  <Link
                    to={`/posts/${post.id}`}
                    className={getReadMoreButtonStyle("md")}
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
        ) : !error ? (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
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
                投稿がありません
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {categoryConfig.name}カテゴリには、まだ投稿がありません。
              </p>
              <div className="space-y-3">
                <BackToHomeButton />
                <p className="text-sm text-gray-400">
                  他のカテゴリもチェックしてみてください
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default Category;

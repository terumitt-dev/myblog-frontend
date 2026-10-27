// app/src/components/molecules/PostDetailSkeleton.tsx
import Skeleton from "@/components/atoms/Skeleton";
import { cn } from "@/components/utils/cn";

type Props = {
  className?: string;
};

const PostDetailSkeleton = ({ className }: Props) => {
  return (
    <main
      role="main"
      className={cn(
        "bg-gray-100 dark:bg-gray-800 w-full rounded-xl overflow-hidden py-8",
        "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",
        className,
      )}
      aria-label="記事を読み込み中"
    >
      {/* 記事エリアのスケルトン */}
      <article
        className={cn(
          "w-full bg-white dark:bg-gray-700 rounded-xl shadow-sm p-6 space-y-6",
        )}
        aria-label="記事内容を読み込み中"
      >
        {/* ヘッダー部分 */}
        <header className="space-y-4">
          {/* メタ情報とバックボタン */}
          <div className="text-center space-y-4">
            <div className="flex justify-center items-center gap-4">
              <Skeleton
                variant="rectangular"
                height="1.5rem"
                width="4rem"
                className="rounded-full"
              />
              <Skeleton variant="text" height="1rem" width="6rem" />
            </div>
            <Skeleton
              variant="rectangular"
              height="2rem"
              width="8rem"
              className="rounded-sm mx-auto"
            />
          </div>
        </header>

        {/* 記事本文エリア */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
          {/* タイトル */}
          <header>
            <Skeleton variant="text" height="3rem" width="85%" />
          </header>

          {/* 記事本文 */}
          <div className="space-y-3">
            <Skeleton variant="text" lines={8} />
          </div>
        </div>

        {/* コメントセクション */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
          {/* コメント見出し */}
          <Skeleton variant="text" height="2rem" width="8rem" />

          {/* コメントフォームボタン */}
          <div className="mb-8">
            <Skeleton
              variant="rectangular"
              height="3rem"
              width="100%"
              className="rounded-lg"
            />
          </div>

          {/* コメント一覧 */}
          <div className="space-y-6">
            <div className="text-center py-8">
              <Skeleton
                variant="text"
                height="1rem"
                width="20rem"
                className="mx-auto"
              />
            </div>
          </div>
        </section>
      </article>
    </main>
  );
};

export default PostDetailSkeleton;

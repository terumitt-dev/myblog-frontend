// app/src/components/organisms/CommentList.tsx
import { useState } from "react";
import { cn } from "@/components/utils/cn";
import CommentItem from "@/components/molecules/CommentItem";
import type { Comment } from "@/types";

type Props = {
  comments: Comment[];
};

const CommentList = ({ comments }: Props) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleComments = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 sticky top-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          コメント ({comments.length})
        </h2>

        {comments.length > 0 && (
          <button
            onClick={toggleComments}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
              "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600",
              "text-gray-700 dark:text-gray-300",
            )}
            aria-expanded={isExpanded}
            aria-controls="comments-content"
          >
            <svg
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                isExpanded ? "rotate-180" : "rotate-0",
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* コンテンツ */}
      <div
        id="comments-content"
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-none opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="p-6">
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                まだコメントがありません
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentList;

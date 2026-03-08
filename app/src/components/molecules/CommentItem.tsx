// app/src/components/molecules/CommentItem.tsx
import { useState } from "react";
import type { Comment } from "@/types";

type Props = {
  comment: Comment;
  maxLength?: number; // トランケートする文字数（デフォルト: 100）
};

const CommentItem = ({ comment, maxLength = 100 }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isLongComment = comment.comment.length > maxLength;
  const displayText =
    isLongComment && !isExpanded
      ? comment.comment.substring(0, maxLength) + "..."
      : comment.comment;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-600 pb-4 last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm text-gray-900 dark:text-white">
          {comment.user_name}
        </h4>
        <time
          dateTime={comment.created_at}
          className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2"
        >
          {new Date(comment.created_at).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <div className="whitespace-pre-wrap">{displayText}</div>
        {isLongComment && (
          <button
            onClick={toggleExpanded}
            className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors underline"
            aria-expanded={isExpanded}
          >
            {isExpanded ? "折りたたむ" : "もっと見る"}
          </button>
        )}
      </div>
    </div>
  );
};

export default CommentItem;

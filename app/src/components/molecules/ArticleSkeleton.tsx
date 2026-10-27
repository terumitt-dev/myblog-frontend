// app/src/components/molecules/ArticleSkeleton.tsx
import Skeleton from "@/components/atoms/Skeleton";
import { cn } from "@/components/utils/cn";

type Props = {
  count?: number;
  className?: string;
};

const ArticleSkeleton = ({ count = 3, className }: Props) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-700 rounded-xl shadow-sm p-4 space-y-3"
          role="presentation"
        >
          <Skeleton variant="text" height="1.5rem" />
          <Skeleton variant="text" lines={2} />
          <Skeleton variant="rectangular" height="1rem" width="60%" />
        </div>
      ))}
    </div>
  );
};

export default ArticleSkeleton;

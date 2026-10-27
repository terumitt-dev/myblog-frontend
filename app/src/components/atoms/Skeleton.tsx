// app/src/components/atoms/Skeleton.tsx
import { cn } from "@/components/utils/cn";

type Props = {
  variant?: "text" | "rectangular" | "circular";
  width?: string;
  height?: string;
  className?: string;
  lines?: number; // テキスト用
};

const Skeleton = ({
  variant = "rectangular",
  width,
  height,
  className,
  lines = 1,
}: Props) => {
  const baseClasses = "bg-gray-200 dark:bg-gray-700 animate-pulse";

  const variantClasses = {
    text: "rounded-sm h-4",
    rectangular: "rounded-sm",
    circular: "rounded-full",
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              variantClasses.text,
              index === lines - 1 ? "w-3/4" : "w-full",
            )}
            style={{ width: width && index === 0 ? width : undefined }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
      role="presentation"
      aria-label="読み込み中"
    />
  );
};

export default Skeleton;

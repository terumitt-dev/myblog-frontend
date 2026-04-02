// app/src/components/layouts/Container.tsx
import React from "react";
import { cn } from "@/components/utils/cn";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  role?: string;
  size?: "main" | "narrow" | "wide" | "full"; // コンテナサイズのバリエーションを追加
  padding?:
    | "default"
    | "section"
    | "sectionLarge"
    | "component"
    | "componentLarge"; // パディングのバリエーションを追加
}

const Container: React.FC<ContainerProps> = ({
  children,
  className,
  id,
  role,
  size = "main", // デフォルトはmain
  padding = "default", // デフォルトはdefault
}) => {
  const sizeClasses = {
    main: "max-w-5xl mx-auto",
    narrow: "max-w-3xl mx-auto",
    wide: "max-w-7xl mx-auto",
    full: "max-w-full mx-auto",
  };

  const paddingClasses = {
    default: "px-4 sm:px-6 lg:px-8", // RESPONSIVE_SPACING.container に相当
    section: "p-4 sm:p-6",
    sectionLarge: "p-4 sm:p-6 lg:p-8",
    component: "p-2 sm:p-3 lg:p-4",
    componentLarge: "p-3 sm:p-4 lg:p-6",
  };

  return (
    <div
      id={id}
      role={role}
      className={cn(
        sizeClasses[size],
        paddingClasses[padding],
        "w-full", // LAYOUT_PATTERNS.sectionContainer の 'w-full' に相当
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Container;

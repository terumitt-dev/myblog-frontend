// app/src/components/molecules/ThemeToggle.tsx
import { memo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { useAccessibility } from "@/hooks/useAccessibility";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  // useAccessibilityからアクセシビリティ状態を取得
  const { highContrast } = useAccessibility();

  // 高コントラストモード用のクラス
  const buttonClass = `p-2 rounded-full border transition-colors ${
    highContrast
      ? "border-black dark:border-white bg-white dark:bg-gray-900"
      : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
  } hover:bg-gray-100 dark:hover:bg-gray-700`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={buttonClass}
      aria-label={
        theme === "dark"
          ? "ライトモードに切り替える"
          : "ダークモードに切り替える"
      }
      title={
        theme === "dark"
          ? "ライトモードに切り替える"
          : "ダークモードに切り替える"
      }
    >
      {theme === "dark" ? (
        <Sun
          className={highContrast ? "text-yellow-500" : "text-yellow-300"}
          aria-hidden="true"
          size={20}
        />
      ) : (
        <Moon
          className={
            highContrast
              ? "text-blue-900 dark:text-blue-100"
              : "text-gray-700 dark:text-gray-300"
          }
          aria-hidden="true"
          size={20}
        />
      )}
    </button>
  );
};

export default memo(ThemeToggle);

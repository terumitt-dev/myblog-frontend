// app/src/components/utils/colors.ts
// カテゴリー関連の色彩
export const CATEGORY_COLORS = {
  hobby: {
    bg: "bg-category-hobby-bg", // TailwindクラスとしてCSS変数を参照
    hex: "var(--color-category-hobby-bg)", // CSS変数を参照（ダークモード対応）
    accent: "var(--color-category-hobby-bg)", // ボタン背景色用
    text: "#ffffff", // ボタンテキスト色（白）
    name: "しゅみ",
  },
  tech: {
    bg: "bg-category-tech-bg",
    hex: "var(--color-category-tech-bg)", // CSS変数を参照（ダークモード対応）
    accent: "var(--color-category-tech-bg)", // ボタン背景色用
    text: "#ffffff", // ボタンテキスト色（白）
    name: "テック",
  },
  other: {
    bg: "bg-category-other-bg",
    hex: "var(--color-category-other-bg)", // CSS変数を参照（ダークモード対応）
    accent: "var(--color-category-other-bg)", // ボタン背景色用
    text: "#ffffff", // ボタンテキスト色（白）
    name: "その他",
  },
  uncategorized: {
    bg: "bg-category-uncategorized-bg",
    hex: "var(--color-category-uncategorized-bg)",
    accent: "var(--color-category-uncategorized-bg)",
    text: "#ffffff",
    name: "未分類",
  },
} as const;

// 汎用UI色彩パレット
export const UI_COLORS = {
  // 青系（プライマリー）
  blue: {
    bg: "bg-ui-primary-600 hover:bg-ui-primary-700",
    bgDark: "dark:bg-ui-primary-700 dark:hover:bg-ui-primary-800",
    text: "text-ui-primary-text-light dark:text-ui-primary-text-dark",
    textHover: "hover:text-ui-primary-800 dark:hover:text-ui-primary-text-dark",
    focus: "focus:ring-ui-primary-500",
  },

  // 赤系（エラー・危険）
  red: {
    bg: "bg-ui-danger-600 hover:bg-ui-danger-700",
    text: "text-ui-danger-text-light dark:text-ui-danger-text-dark",
    textHover: "hover:text-ui-danger-800 dark:hover:text-ui-danger-text-dark",
    focus: "focus:ring-ui-primary-500", // Tailwindのデフォルトであるblue-500をそのまま使うか、専用の色を設定
    errorBg: "bg-ui-danger-100 dark:bg-ui-danger-900",
    errorText: "text-ui-danger-700 dark:text-ui-danger-text-200",
    errorBorder: "border-ui-danger-400 dark:border-ui-danger-600-dark",
  },

  // 緑系（成功・確認）
  green: {
    bg: "bg-ui-success-600 hover:bg-ui-success-700",
    text: "text-ui-success-text-light dark:text-ui-success-text-dark",
    textHover: "hover:text-ui-success-800 dark:hover:text-ui-success-text-dark",
    focus: "focus:ring-ui-primary-500", // Tailwindのデフォルトであるblue-500をそのまま使うか、専用の色を設定
  },
} as const;

export type CategoryType = keyof typeof CATEGORY_COLORS;

// ========== 新規追加：共通ボタンスタイル ==========

// 「続きを読む」ボタン専用スタイル
export const READ_MORE_BUTTON = {
  base: "inline-flex items-center px-3 py-2 rounded-lg font-medium transition-colors duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none",
  colors: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
  // サイズバリエーション
  sizes: {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-5 py-3 text-lg",
  },
} as const;

// ヘルパー関数：読み込みボタンのスタイルを取得
export const getReadMoreButtonStyle = (
  size: keyof typeof READ_MORE_BUTTON.sizes = "sm",
): string => {
  return `${READ_MORE_BUTTON.base} ${READ_MORE_BUTTON.colors}`.replace(
    "px-3 py-2",
    READ_MORE_BUTTON.sizes[size],
  );
};

// ========== 既存：セマンティックカラーシステム ==========

// 既存のUI_COLORSを活用したセマンティックなカラーシステム
export const SEMANTIC_COLORS = {
  // Primary（メインアクション・ブランドカラー）
  primary: {
    ...UI_COLORS.blue,
    // 追加のバリエーション
    solid: "bg-ui-primary-600 hover:bg-ui-primary-700 text-white",
    outline:
      "border border-ui-primary-600 text-ui-primary-600 hover:bg-ui-primary-600 hover:text-white",
    ghost:
      "text-ui-primary-600 hover:bg-ui-primary-100 dark:hover:bg-ui-primary-900",
    subtle:
      "bg-ui-primary-100 text-ui-primary-800 dark:bg-ui-primary-900 dark:text-ui-primary-200",
  },

  // Secondary（サブアクション・グレー系）
  secondary: {
    bg: "bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600",
    text: "text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
    textHover: "hover:text-gray-800 dark:hover:text-gray-200",
    focus: "focus:ring-gray-500",
    // バリエーション
    solid: "bg-gray-600 hover:bg-gray-700 text-white",
    outline:
      "border border-gray-600 text-gray-600 hover:bg-gray-600 hover:text-white",
    ghost: "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800",
    subtle: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },

  // Danger（削除・エラー・警告）
  danger: {
    ...UI_COLORS.red,
    // 追加のバリエーション
    solid: "bg-ui-danger-600 hover:bg-ui-danger-700 text-white",
    outline:
      "border border-ui-danger-600 text-ui-danger-600 hover:bg-ui-danger-600 hover:text-white",
    ghost:
      "text-ui-danger-600 hover:bg-ui-danger-100 dark:hover:bg-ui-danger-900",
    subtle:
      "bg-ui-danger-100 text-ui-danger-800 dark:bg-ui-danger-900 dark:text-ui-danger-200",
  },

  // Success（成功・完了・承認）
  success: {
    ...UI_COLORS.green,
    // 追加のバリエーション
    solid: "bg-ui-success-600 hover:bg-ui-success-700 text-white",
    outline:
      "border border-ui-success-600 text-ui-success-600 hover:bg-ui-success-600 hover:text-white",
    ghost: "text-ui-success-600 hover:bg-green-100 dark:hover:bg-green-900",
    subtle: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
} as const;

// 使いやすさのための型定義
export type SemanticColorKey = keyof typeof SEMANTIC_COLORS;
export type ColorVariant = "solid" | "outline" | "ghost" | "subtle";

// ヘルパー関数：セマンティックカラーを簡単に取得
export const getSemanticColor = (
  color: SemanticColorKey,
  variant: ColorVariant = "solid",
): string => {
  return SEMANTIC_COLORS[color][variant];
};

// ========== 既存コード（変更なし） ==========

// Layout.tsxで使用されている色を定数化（参考用・将来使用予定）
export const LAYOUT_COLORS = {
  // Layout.tsxの現在のクラス名をそのまま定数化
  mainBackground:
    "min-h-screen bg-gradient-to-b from-layout-gradient-from-light to-layout-gradient-to-light dark:from-layout-gradient-from-dark dark:to-layout-gradient-to-dark text-layout-text-light dark:text-layout-text-dark",

  // 分割版（将来的に細かく使いたい場合）
  gradient: {
    full: "bg-gradient-to-b from-layout-gradient-from-light to-layout-gradient-to-light dark:from-layout-gradient-from-dark dark:to-layout-gradient-to-dark",
    light: "from-layout-gradient-from-light to-layout-gradient-to-light",
    dark: "dark:from-layout-gradient-from-dark dark:to-layout-gradient-to-dark",
  },

  text: "text-layout-text-light dark:text-layout-text-dark",
  container: "mx-auto max-w-5xl px-4 sm:px-6 lg:px-8", // これは色ではないが、レイアウト関連でまとめておく
} as const;

// 将来的な拡張用
export const FUTURE_COLORS = {
  // 今後新しい色定義があれば追加
} as const;

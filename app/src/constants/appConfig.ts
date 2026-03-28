// app/src/constants/appConfig.ts

/**
 * アプリケーション全体で使用される定数
 */

// 文字数制限設定
export const TEXT_LIMITS = {
  TITLE_MAX_LENGTH: 100,
  CONTENT_MAX_LENGTH: 50000,
  DEFAULT_MAX_LENGTH: 1000,
  PREVIEW_LENGTH: 100,
} as const;

// エフェクト要素サイズ
export const EFFECT_SIZES = {
  SNAIL_SIZE: 60,
  SPIDER_SIZE: 50,
  DEFAULT_MARGIN: 20,
} as const;

// デフォルト画面サイズ（SSR対応）
export const DEFAULT_SCREEN_SIZE = {
  WIDTH: 1024,
  HEIGHT: 768,
} as const;

// パフォーマンス監視設定
export const PERFORMANCE_CONFIG = {
  MEMORY_UPDATE_INTERVAL: 5000, // 5秒
  SLOW_RENDER_THRESHOLD: 200, // 200ms
  FPS_CALCULATION_INTERVAL: 1000, // 1秒
} as const;

// ID生成用オフセット
export const ID_OFFSETS = {
  SNAIL_OFFSET: 1000,
  SPIDER_OFFSET: 0,
} as const;

// バリデーション設定
export const VALIDATION = {
  ALLOWED_CATEGORIES: ["tech", "hobby", "other"] as const,
} as const;

// UI設定
export const UI_CONFIG = {
  TEXTAREA_ROWS: 10,
  ICON_SIZE: 20,
} as const;

// テスト用設定
export const TEST_CONFIG = {
  DEFAULT_DELAY: 1000,
  ADVANCE_TIME_STEP: 1000,
  LONG_ADVANCE_TIME: 3000,
  SHORT_ADVANCE_TIME: 500,
  MEMORY_CHECK_INTERVAL: 5000,
} as const;

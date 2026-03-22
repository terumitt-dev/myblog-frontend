// app/src/types/index.ts
// Rails スキーマに基づく型定義

// 管理者情報（Devise使用）
export interface Admin {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
}

// 認証関連のレスポンス型
export interface AuthResponse {
  admin: Admin;
  token: string;
  message: string;
}

// エラーレスポンス型
export interface ErrorResponse {
  message: string;
  status: number;
}

// カテゴリ（enumの値）
export enum BlogCategory {
  HOBBY = 0,
  TECH = 1,
  OTHER = 2,
}

// カテゴリ表示名のマッピング
export const CATEGORY_NAMES: Record<BlogCategory, string> = {
  [BlogCategory.HOBBY]: "hobby",
  [BlogCategory.TECH]: "tech",
  [BlogCategory.OTHER]: "other",
};

// ブログ記事
export interface Blog {
  id: number;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

// コメント
export interface Comment {
  id: number;
  blog_id: number;
  user_name: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

// API レスポンス用の Blog（カテゴリ名を含む）
export interface BlogWithCategoryName extends Blog {
  category_name: string;
}

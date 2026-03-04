// app/src/api/base.ts
export const getApiBase = (): string => {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const apiBase = typeof raw === "string" ? raw.trim() : "";

  // 本番ビルド時は環境変数必須（空白のみもNG）
  if (import.meta.env.PROD && !apiBase) {
    throw new Error("VITE_API_BASE_URL is required in production");
  }

  // 本番ビルド時は「絶対URLならHTTPS必須」。相対パス（同一オリジン想定）は許可する。
  if (import.meta.env.PROD && apiBase) {
    const isRelative = apiBase.startsWith("/");
    const isHttpsAbsolute = apiBase.startsWith("https://");
    const isHttpAbsolute = apiBase.startsWith("http://");

    if (!isRelative && !isHttpsAbsolute) {
      if (isHttpAbsolute) {
        throw new Error("VITE_API_BASE_URL must use HTTPS in production");
      }
      throw new Error(
        "VITE_API_BASE_URL must be an absolute https URL or a relative path in production",
      );
    }
  }

  // 開発環境ではViteプロキシ等を利用できるよう相対パスにフォールバック
  const baseUrl = apiBase || "/api";

  // 相対パスは常に `/` 始まりに正規化（例: "api" -> "/api"）
  const normalizedBaseUrl =
    baseUrl.startsWith("http://") || baseUrl.startsWith("https://")
      ? baseUrl
      : baseUrl.startsWith("/")
        ? baseUrl
        : `/${baseUrl}`;

  // 末尾スラッシュを除去（複数本も確実に除去）
  return normalizedBaseUrl.replace(/\/+$/, "");
};

export const API_BASE = getApiBase();

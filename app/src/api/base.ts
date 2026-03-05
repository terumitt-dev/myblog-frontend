// app/src/api/base.ts
export const getApiBase = (): string => {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const apiBase = typeof raw === "string" ? raw.trim() : "";

  // 開発環境ではViteプロキシ等を利用できるよう相対パスにフォールバック
  const baseUrl = apiBase || "/api";

  // 相対パスは常に `/` 始まりに正規化（例: "api" -> "/api"）
  const normalizedBaseUrl = /^(https?:)\/\//i.test(baseUrl)
    ? baseUrl
    : baseUrl.startsWith("/")
      ? baseUrl
      : `/${baseUrl}`;

  // 本番ビルド時は環境変数必須（空白のみもNG）
  if (import.meta.env.PROD && !apiBase) {
    throw new Error("VITE_API_BASE_URL is required in production");
  }

  // 本番ビルド時は「絶対URLならHTTPS必須」。相対パス（同一オリジン想定）は許可する。
  if (import.meta.env.PROD) {
    if (/^http:\/\//i.test(normalizedBaseUrl)) {
      throw new Error("VITE_API_BASE_URL must use HTTPS in production");
    }
    const isRelative = normalizedBaseUrl.startsWith("/");
    const isHttpsAbsolute = /^https:\/\//i.test(normalizedBaseUrl);
    if (!isRelative && !isHttpsAbsolute) {
      throw new Error(
        "VITE_API_BASE_URL must be an absolute https URL or a relative path in production",
      );
    }
  }

  // 末尾スラッシュを除去（ただし "/" 自体は維持する）
  return normalizedBaseUrl.length > 1
    ? normalizedBaseUrl.replace(/\/+$/, "")
    : normalizedBaseUrl;
};

export const API_BASE = getApiBase();

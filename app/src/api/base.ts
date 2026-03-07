// app/src/api/base.ts
export const getApiBase = (): string => {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const apiBase = typeof raw === "string" ? raw.trim() : "";

  // 改行・バックスラッシュ等の制御文字は拒否（URL解釈の崩れ/例外を防ぐ）
  if (/[\\\r\n]/.test(apiBase)) {
    throw new Error("VITE_API_BASE_URL must not include backslashes or newlines");
  }

  // `ftp://...` 等の誤設定を相対パス扱いにしない（意図しないパスへの通信を防ぐ）
  if (/:\/\//.test(apiBase) && !/^(https?:)\/\//i.test(apiBase)) {
    throw new Error(
      "VITE_API_BASE_URL must be an absolute http(s) URL or a relative path",
    );
  }

  // `//example.com` のようなプロトコル相対URLは外部送信になり得るため禁止
  if (/^\/\//.test(apiBase)) {
    throw new Error("VITE_API_BASE_URL must not be a protocol-relative URL");
  }

  // ベースURLにクエリ/ハッシュは含めない（全リクエストへの混入を防ぐ）
  if (apiBase && /[?#]/.test(apiBase)) {
    throw new Error("VITE_API_BASE_URL must not include query or hash");
  }

  // 開発環境ではViteプロキシ等を利用できるよう相対パスにフォールバック
  const baseUrl = apiBase || "/api";

  // 相対パスは常に `/` 始まりに正規化（例: "api" -> "/api"）
  const normalizedBaseUrl = /^(https?:)\/\//i.test(baseUrl)
    ? baseUrl
    : baseUrl.startsWith("/")
      ? baseUrl
      : `/${baseUrl}`;

  // 絶対URLにユーザー情報（user:pass@）が含まれる設定は拒否（意図しない認証情報送出の防止）
  if (/^https?:\/\//i.test(normalizedBaseUrl)) {
    let u: URL;
    try {
      u = new URL(normalizedBaseUrl);
    } catch {
      throw new Error("VITE_API_BASE_URL must be a valid absolute http(s) URL");
    }
    if (u.username || u.password) {
      throw new Error("VITE_API_BASE_URL must not include URL credentials");
    }

    // 絶対URLでもドットセグメントを禁止（URL正規化で別パスに化けるのを防ぐ）
    const rawPath = (() => {
      const m = normalizedBaseUrl.match(/^https?:\/\/[^\/]+(\/[^?#]*)/i);
      return m?.[1] ?? "/";
    })();

    const decodedPath = (() => {
      try {
        return decodeURIComponent(rawPath);
      } catch {
        return rawPath;
      }
    })();

    const hasDotSegments =
      /(^|\/)\.\.(\/|$)/.test(rawPath) ||
      /(^|\/)\.(\/|$)/.test(rawPath) ||
      /(^|\/)\.\.(\/|$)/.test(decodedPath) ||
      /(^|\/)\.(\/|$)/.test(decodedPath);

    const hasEncodedDotSegments =
      /(^|\/|%2f)%2e(%2e)?(\/|%2f|$)/i.test(rawPath);

    if (hasDotSegments || hasEncodedDotSegments) {
      throw new Error("VITE_API_BASE_URL must not include dot segments");
    }
  }

  // 相対パスのドットセグメントを禁止（誤設定/意図しないパス解決を防ぐ）
  if (normalizedBaseUrl.startsWith("/")) {
    const decoded = (() => {
      try {
        return decodeURIComponent(normalizedBaseUrl);
      } catch {
        return normalizedBaseUrl;
      }
    })();

    const hasDotSegments =
      /(^|\/)\.\.(\/|$)/.test(decoded) || /(^|\/)\.(\/|$)/.test(decoded);

    const hasEncodedDotSegments =
      /(^|\/|%2f)%2e(%2e)?(\/|%2f|$)/i.test(normalizedBaseUrl);

    if (hasDotSegments || hasEncodedDotSegments) {
      throw new Error("VITE_API_BASE_URL must not include dot segments");
    }
  }

  // 本番ビルド時: 明示設定が空文字/空白のみはNG（未設定なら同一オリジン相対パスを許容）
  const hasExplicitEnv = typeof raw === "string";
  if (import.meta.env.PROD && hasExplicitEnv && !apiBase) {
    throw new Error("VITE_API_BASE_URL must not be empty in production");
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

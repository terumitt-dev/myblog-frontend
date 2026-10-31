// app/src/components/utils/xConnect.ts
// X (Twitter) 連携 (OAuth) の管理画面側ロジック。

// backend が dispatch から受け取った認可URLを返してくる。ブラウザをそのURLに遷移させるため、
// 想定外の宛先に飛ばされないよう、フロントでも https かつ X のホストであることを確認する
// (backend の検証に加えた二重の防御。backend/dispatch が改ざんされた場合のフィッシング対策)。
const ALLOWED_AUTHORIZE_HOSTS = ["twitter.com", "x.com"];

export const isTrustedAuthorizeUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ALLOWED_AUTHORIZE_HOSTS.includes(url.hostname.toLowerCase()) &&
      // userinfo 付き (https://twitter.com@evil.example/) は new URL では hostname が evil になるが、
      // 念のため認証情報を含む URL 自体を拒否する。
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
};

// backend が callback の結果として /admin?x_connect=<result> にリダイレクトしてくる。
// URL は誰でも細工できるため、既知の3値だけを受け付け、それ以外は無視する
// (URL の値をそのまま画面に表示しない)。
export const RESULT_QUERY_KEY = "x_connect";

export type XConnectResult = "success" | "denied" | "error";

const KNOWN_RESULTS: readonly XConnectResult[] = ["success", "denied", "error"];

export const parseXConnectResult = (value: string | null): XConnectResult | null =>
  KNOWN_RESULTS.find((known) => known === value) ?? null;

export const X_CONNECT_RESULT_MESSAGES: Record<
  XConnectResult,
  { type: "success" | "error"; message: string }
> = {
  success: { type: "success", message: "Xとの連携が完了しました。" },
  denied: {
    type: "error",
    message: "Xでの連携が許可されませんでした。連携する場合は、もう一度お試しください。",
  },
  error: {
    type: "error",
    message:
      "Xとの連携に失敗しました。連携を始めたブラウザで、5分以内に完了させてください。解決しない場合は、もう一度お試しください。",
  },
};

export const X_CONNECT_CONFIRM_MESSAGE =
  "Xの認可画面に移動して、連携するアカウントを選びます。すでに連携済みの場合は、連携中のアカウントが置き換わります。よろしいですか？";

export const X_CONNECT_START_ERROR_MESSAGE = "Xとの連携を開始できませんでした";
export const X_CONNECT_UNTRUSTED_URL_MESSAGE =
  "Xとの連携を開始できませんでした (認可URLが不正です)";

// ログイン後の遷移先を決める。
//
// backend が callback の結果を /admin?x_connect=... への 302 で返すと、ページ全体が
// 再読み込みされ、メモリ上にしかないログイン状態が失われて /login に飛ばされる。
// ルーターは元の場所を state.from に渡しているので、ログイン後に結果付きの /admin に戻し、
// 連携の成否を表示できるようにする。
//
// state.from は任意の値になりえるため、そのまま使わない。許可するのは
// 「/admin、および既知の x_connect の値だけを付けた /admin」のみで、
// それ以外 (他のパス・他のクエリ・ハッシュ) は従来どおり /admin に戻す。
export const resolveAdminReturnPath = (from: unknown): string => {
  const fallback = "/admin";
  if (typeof from !== "object" || from === null) return fallback;

  const { pathname, search } = from as { pathname?: unknown; search?: unknown };
  if (pathname !== "/admin" || typeof search !== "string") return fallback;

  const result = parseXConnectResult(new URLSearchParams(search).get(RESULT_QUERY_KEY));
  return result ? `/admin?${RESULT_QUERY_KEY}=${result}` : fallback;
};

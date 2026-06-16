// src/components/organisms/CommentForm.tsx
import { useState, useId, useCallback } from "react";
import Input from "@/components/atoms/Input";
import Textarea from "@/components/atoms/Textarea";
import CommentButtons from "@/components/molecules/CommentButtons";
import TurnstileWidget from "@/components/molecules/TurnstileWidget";

// Cloudflare Turnstile の Site Key。
// dev / test 環境では Cloudflare 公開のテストキー (always pass) にフォールバック
// する。本番ビルドは Drone CI が --build-arg VITE_TURNSTILE_SITE_KEY で
// 本物の Site Key を埋め込む (app/Dockerfile.prod 参照)。
//
// 本番では未設定 / 空文字を fail-fast で弾く:
// - 公開テストキーへのフォールバックが Turnstile を実質無効化する事故を防ぐ
// - 設定漏れをデプロイ直後 (モジュールロード時) に検知できる
// - Dockerfile.prod 側でも build 時に required チェック済みだが二重ガード
//
// 評価順:
// - 値が設定されていればそれを使う
// - 未設定または空文字なら、本番では空のまま (下の if で throw)、dev/test は
//   公開テストキー (1x00000000000000000000AA, always pass) にフォールバック
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ||
  (import.meta.env.PROD ? "" : "1x00000000000000000000AA");

if (!TURNSTILE_SITE_KEY) {
  throw new Error("VITE_TURNSTILE_SITE_KEY is required in production");
}

// turnstileError state の取り得る値:
// - null: エラー無し
// - "error": widget のロード失敗 / script ブロック / network 断 等
// - "expire": token の有効期限切れ (Cloudflare が再 challenge を促す状態)
// 文言を分けることでユーザーが原因を把握しやすくする。
type TurnstileErrorState = null | "error" | "expire";

const TURNSTILE_ERROR_MESSAGES: Record<Exclude<TurnstileErrorState, null>, string> = {
  error:
    "認証 widget の読み込みに失敗しました。ネットワーク状況を確認し、ページを再読み込みしてください。",
  expire: "認証の有効期限が切れました。widget を再度お試しください。",
};

type Props = {
  /**
   * 送信処理。Promise を返す場合はその解決を待ってから入力欄をクリアする
   * (失敗 = reject なら入力欄を保持してユーザーがリトライできるようにする)。
   * 同期実装 (void 返却) もサポートし、その場合は従来通り即クリアする。
   */
  onSubmit: (
    userName: string,
    comment: string,
    turnstileToken: string,
  ) => void | Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
};

const CommentForm = ({ onSubmit, onCancel, disabled = false }: Props) => {
  const [userName, setUserName] = useState("");
  const [comment, setComment] = useState("");
  // Turnstile 検証 token。widget が解決し終わるまでは null。
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // submit 成功後に widget を reset するためのカウンタ。
  const [resetSignal, setResetSignal] = useState(0);
  // widget のエラー / 期限切れ状態。ユーザーへフィードバックを表示するために使う
  // (token を null にするだけだとボタンが急に disabled になる理由が伝わらない)。
  const [turnstileError, setTurnstileError] =
    useState<TurnstileErrorState>(null);

  const userNameId = useId();
  const commentId = useId();

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(null);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    // token の有効期限切れ。submit を再度ブロックするため state をクリアし、
    // ユーザーには有効期限切れの旨を expire 用メッセージで伝える。
    setTurnstileToken(null);
    setTurnstileError("expire");
  }, []);

  const handleTurnstileError = useCallback(() => {
    // widget 側のエラー (ネットワーク断 / script load 失敗 / 描画例外など)。
    // token を無効化し、ユーザー向けにロード失敗メッセージを出す。
    setTurnstileToken(null);
    setTurnstileError("error");
  }, []);

  const handleSubmit = async () => {
    if (
      !userName.trim() ||
      !comment.trim() ||
      !turnstileToken ||
      disabled
    ) {
      return;
    }

    try {
      // onSubmit が同期 (void) の場合も await で素通りする。
      // 非同期 (Promise) を返す場合は完了/失敗を待ってから次の処理に進む。
      await onSubmit(userName, comment, turnstileToken);
    } catch {
      // 投稿失敗時は入力欄と token を保持し、ユーザーが再投稿できるようにする。
      // エラー表示は親 (PostDetail) 側の責務。
      return;
    }

    setUserName("");
    setComment("");
    // 次の投稿用に widget を reset し、再 challenge を求める。
    setTurnstileToken(null);
    setResetSignal((prev) => prev + 1);
  };

  // 送信ボタンの disabled 判定: 親からの disabled に加えて、
  // 入力欠落 / Turnstile 未完了のいずれかを満たさない場合も送信不可。
  const submitDisabled =
    disabled || !userName.trim() || !comment.trim() || !turnstileToken;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
      <Input
        id={`username-${userNameId}`}
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="ユーザ名"
        disabled={disabled}
      />
      <Textarea
        id={`comment-${commentId}`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="コメントを入力"
        disabled={disabled}
        rows={4}
      />
      <TurnstileWidget
        siteKey={TURNSTILE_SITE_KEY}
        onSuccess={handleTurnstileSuccess}
        onExpire={handleTurnstileExpire}
        onError={handleTurnstileError}
        resetSignal={resetSignal}
      />
      {turnstileError && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {TURNSTILE_ERROR_MESSAGES[turnstileError]}
        </p>
      )}
      <CommentButtons
        onSubmit={handleSubmit}
        onCancel={onCancel}
        disabled={submitDisabled}
      />
    </div>
  );
};

export default CommentForm;

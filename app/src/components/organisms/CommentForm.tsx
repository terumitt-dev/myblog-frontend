// src/components/organisms/CommentForm.tsx
import { useState, useId, useCallback, useRef } from "react";
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
// - "submit_failed": 投稿失敗で token を破棄して widget を reset した状態
//   (widget が「未解決」表示に戻るだけだと「なぜ再度認証が必要なのか」が
//    伝わらないため、widget 直下にも理由をテキストで提示する)
// 文言を分けることでユーザーが原因を把握しやすくする。
type TurnstileErrorState = null | "error" | "expire" | "submit_failed";

const TURNSTILE_ERROR_MESSAGES: Record<Exclude<TurnstileErrorState, null>, string> = {
  error:
    "認証 widget の読み込みに失敗しました。ネットワーク状況を確認し、ページを再読み込みしてください。",
  expire: "認証の有効期限が切れました。widget を再度お試しください。",
  submit_failed:
    "投稿が失敗しました。認証 widget を再度解いてから、もう一度お試しください。",
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
  // 二重送信防止:
  // - isSubmittingRef: 同期的な再入ガード (ref は即時反映、state の render lag を
  //   待たない)。await 中の連打で同じ Turnstile token が使い回されるのを防ぐ。
  // - isSubmitting: UI 反映用 (submit ボタンの disabled、視覚的フィードバック)。
  // 両者を組み合わせることで、視覚的にも論理的にも二重送信を弾く。
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // 同期的な再入ガード。state ベースの isSubmitting は次回 render まで
    // 反映されないので、その間の連打を ref で確実に弾く。
    if (isSubmittingRef.current) {
      return;
    }
    if (
      !userName.trim() ||
      !comment.trim() ||
      !turnstileToken ||
      disabled
    ) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // onSubmit が同期 (void) の場合も await で素通りする。
      // 非同期 (Promise) を返す場合は完了/失敗を待ってから次の処理に進む。
      await onSubmit(userName, comment, turnstileToken);
    } catch {
      // 投稿失敗時の方針:
      // - 入力欄 (userName / comment) は保持 → ユーザーが内容を再入力せずに済む
      // - Turnstile token は破棄 + widget reset → token 再利用の事故を防ぐ
      // - turnstileError = "submit_failed" → widget 直下にメッセージ表示
      //   (widget が「未解決」表示に戻るだけだと再認証が必要な理由が
      //    伝わらないため、文言でも明示する)
      //
      // 理由: Cloudflare Turnstile の token は single-use で、backend の
      // siteverify が 1 度通った時点で消費される (再 verify は失敗する仕様)。
      // 失敗の原因が verify 通過後の処理 (例: DB validation エラー) だった場合、
      // token を保持して再 submit すると backend で再び 422 "認証に失敗" になり、
      // ユーザーは原因不明のループに陥る。
      // ネットワーク断のような「backend 到達せず token 未消費」のケースでは
      // widget 再解決が必要になるが、auto/managed テーマは概ね invisible で
      // 解決するので UX 損失は限定的、トレードオフとして受容する。
      // 失敗の通信ログ (console.error 等) は親 (PostDetail) 側の責務。
      setTurnstileToken(null);
      setTurnstileError("submit_failed");
      setResetSignal((prev) => prev + 1);
      return;
    } finally {
      // 成功 / 失敗のどちらの経路でも送信中フラグを解除する。
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }

    setUserName("");
    setComment("");
    // 次の投稿用に widget を reset し、再 challenge を求める。
    setTurnstileToken(null);
    setResetSignal((prev) => prev + 1);
  };

  // 送信ボタンの disabled 判定: 親からの disabled / 入力欠落 / Turnstile 未完了 /
  // 送信中 (isSubmitting) のいずれかを満たす場合は送信不可。
  // 親 (PostDetail) も `disabled={isSubmittingComment}` を渡すが、その state 反映には
  // re-render を待つため、CommentForm 内の isSubmitting でも視覚的に即時 disable する。
  const submitDisabled =
    isSubmitting ||
    disabled ||
    !userName.trim() ||
    !comment.trim() ||
    !turnstileToken;

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

// src/components/organisms/CommentForm.tsx
import { useState, useId, useCallback } from "react";
import Input from "@/components/atoms/Input";
import Textarea from "@/components/atoms/Textarea";
import CommentButtons from "@/components/molecules/CommentButtons";
import TurnstileWidget from "@/components/molecules/TurnstileWidget";

// Cloudflare Turnstile の Site Key。
// dev / test では Cloudflare 公開のテストキー (always pass) をデフォルトに
// フォールバックする。本番ビルドは Drone CI が --build-arg VITE_TURNSTILE_SITE_KEY
// で本物の Site Key を埋め込む (app/Dockerfile.prod 参照)。
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

type Props = {
  onSubmit: (
    userName: string,
    comment: string,
    turnstileToken: string,
  ) => void;
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
  const [turnstileError, setTurnstileError] = useState(false);

  const userNameId = useId();
  const commentId = useId();

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(false);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    // token の有効期限切れ。submit を再度ブロックするため state をクリアする。
    // ユーザーには再 challenge が必要であることをメッセージで伝える。
    setTurnstileToken(null);
    setTurnstileError(true);
  }, []);

  const handleTurnstileError = useCallback(() => {
    // widget 側のエラー (ネットワーク断 / script load 失敗など)。
    // token を無効化し、ユーザー向けにエラーメッセージを出す。
    setTurnstileToken(null);
    setTurnstileError(true);
  }, []);

  const handleSubmit = () => {
    if (
      userName.trim() &&
      comment.trim() &&
      turnstileToken &&
      !disabled
    ) {
      onSubmit(userName, comment, turnstileToken);
      setUserName("");
      setComment("");
      // 次の投稿用に widget を reset し、再 challenge を求める。
      setTurnstileToken(null);
      setResetSignal((prev) => prev + 1);
    }
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
          認証 widget の読み込みに失敗しました。ネットワーク状況を確認し、ページを再読み込みしてください。
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

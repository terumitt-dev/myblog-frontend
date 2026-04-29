// app/src/pages/PasswordResetRequest.tsx
// パスワードリセット要求画面
// 管理者は1人前提のため、Email入力ではなく SECRET 合言葉を入力して
// 唯一の admin にリセットメールを送信する
import Layout from "@/components/layouts/Layout";
import { useState } from "react";
import { Link } from "react-router-dom";
import LoadingSpinner from "@/components/atoms/LoadingSpinner";
import { cn } from "@/components/utils/cn";
import { API_BASE } from "@/api/base";

const PasswordResetRequest = () => {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // setLoading の反映前に連続クリックされた場合の多重送信は React state では
    // 防げない (state 更新は次のレンダーで反映)。DOM 直の form.dataset を
    // 同期フラグとして使うことで、同一レンダー内の二重 POST を確実に遮断する。
    const form = e.currentTarget;
    if (form.dataset.submitting === "true") {
      return;
    }

    if (!secret.trim()) {
      setError("合言葉を入力してください。");
      return;
    }

    form.dataset.submitting = "true";
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/auth/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret: secret.trim() }),
      });

      // Backend は合言葉の正誤に関わらず常に 202 Accepted を返すため、
      // 2xx 系をそのまま成功扱いする。
      // 正規ユーザーが合言葉を間違えた場合は「メールが届かない」ことで気付ける。
      if (response.ok) {
        setSuccess(true);
        return;
      }

      setError("リセットメールの送信に失敗しました。しばらくしてから再度お試しください。");
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      // 同期フラグを解除して再送信を可能にする
      form.dataset.submitting = "false";
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="max-w-md mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
          <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
              リセット申請を受け付けました
            </h2>
            <p className="text-sm text-green-700 dark:text-green-400">
              合言葉が正しい場合は、管理者のメールアドレス宛にパスワードリセット用のリンクが送信されます。
              メール内のリンクから新しいパスワードを設定してください。
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-3">
              数分経ってもメールが届かない場合は、合言葉をご確認の上、再度お試しください。
            </p>
          </div>
          <Link
            to="/login"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            ← ログイン画面に戻る
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            パスワードリセット
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            合言葉を入力すると、管理者のメールアドレスにリセット用リンクを送信します。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="secret"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              合言葉
            </label>
            <input
              id="secret"
              type="password"
              required
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={loading}
              className={cn(
                "w-full px-4 py-3 border rounded-lg",
                "border-gray-300 dark:border-gray-600",
                "bg-white dark:bg-gray-700",
                "text-gray-900 dark:text-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition duration-200",
              )}
              placeholder="合言葉を入力してください"
              autoComplete="off"
            />
          </div>

          {error && (
            <div
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              role="alert"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !secret.trim()}
            className={cn(
              "w-full py-3 px-4 border border-transparent rounded-lg shadow-sm",
              "text-sm font-medium text-white",
              "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition duration-200 ease-in-out",
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="mr-2" />
                送信中...
              </div>
            ) : (
              "リセットメールを送信"
            )}
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            ← ログイン画面に戻る
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default PasswordResetRequest;

// app/src/pages/PasswordResetConfirm.tsx
// メール内リンクから遷移する新パスワード設定画面
// URLクエリ ?reset_password_token=... を受け取り、新パスワードを設定する
import Layout from "@/components/layouts/Layout";
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import LoadingSpinner from "@/components/atoms/LoadingSpinner";
import { cn } from "@/components/utils/cn";
import { API_BASE } from "@/api/base";

const TOKEN_STORAGE_KEY = "reset_password_token";

const PasswordResetConfirm = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");

  // URL → sessionStorage の順でトークンを同期し、URL上のトークンは即座に除去する
  // マウント中に searchParams が変化しても（同じ画面で別リンクを踏んだ場合など）、
  // useEffect で追従してトークンを更新できる
  useEffect(() => {
    const tokenFromUrl = searchParams.get(TOKEN_STORAGE_KEY);
    if (tokenFromUrl) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, tokenFromUrl);
      setToken(tokenFromUrl);
      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${window.location.hash}`,
      );
      return;
    }
    setToken(sessionStorage.getItem(TOKEN_STORAGE_KEY) || "");
  }, [searchParams]);

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 空白のみの入力を弾くため trim 後に長さを検証
    if (password.trim().length < 6) {
      setError("パスワードは6文字以上で入力してください。");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("パスワードが一致しません。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/auth/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reset_password_token: token,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errors = Array.isArray(data.errors)
          ? data.errors.join(", ")
          : "パスワードの更新に失敗しました。リンクの有効期限切れの可能性があります。";
        // トークン失効系のエラー時は sessionStorage からも破棄し、
        // 再リロードでも壊れた状態から復帰できるようにする
        if ([401, 404, 422].includes(response.status)) {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        }
        setError(errors);
        return;
      }

      // 成功後は sessionStorage のトークンを破棄（再利用防止）
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      setSuccess(true);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  // トークンがない場合はフォームを表示せず、早期リターン
  if (!token) {
    return (
      <Layout>
        <div className="max-w-md mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
          <div
            className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            role="alert"
          >
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
              リセットトークンが無効です
            </h2>
            <p className="text-sm text-red-700 dark:text-red-400">
              メール内のリンクから再度アクセスしてください。
            </p>
          </div>
          <Link
            to="/password/reset"
            className={cn(
              "block text-center py-3 px-4 border border-transparent rounded-lg shadow-sm",
              "text-sm font-medium text-white",
              "bg-blue-600 hover:bg-blue-700",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            )}
          >
            パスワードリセットを再申請する
          </Link>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="max-w-md mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
          <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
              パスワードを更新しました
            </h2>
            <p className="text-sm text-green-700 dark:text-green-400">
              新しいパスワードでログインしてください。
            </p>
          </div>
          <Link
            to="/login"
            className={cn(
              "block text-center py-3 px-4 border border-transparent rounded-lg shadow-sm",
              "text-sm font-medium text-white",
              "bg-blue-600 hover:bg-blue-700",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            )}
          >
            ログイン画面へ
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
            新しいパスワードの設定
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            新しいパスワードを入力してください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              新しいパスワード
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={cn(
                "w-full px-4 py-3 border rounded-lg",
                "border-gray-300 dark:border-gray-600",
                "bg-white dark:bg-gray-700",
                "text-gray-900 dark:text-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:opacity-50",
                "transition duration-200",
              )}
              placeholder="6文字以上"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password_confirmation"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              新しいパスワード（確認）
            </label>
            <input
              id="password_confirmation"
              type="password"
              required
              minLength={6}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              disabled={loading}
              className={cn(
                "w-full px-4 py-3 border rounded-lg",
                "border-gray-300 dark:border-gray-600",
                "bg-white dark:bg-gray-700",
                "text-gray-900 dark:text-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:opacity-50",
                "transition duration-200",
              )}
              placeholder="もう一度入力してください"
              autoComplete="new-password"
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
            disabled={loading || !password || !passwordConfirmation}
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
                更新中...
              </div>
            ) : (
              "パスワードを更新"
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

export default PasswordResetConfirm;

// app/src/pages/Login.tsx
import Layout from "@/components/layouts/Layout";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/atoms/LoadingSpinner";
import { cn } from "@/components/utils/cn";

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(email, password);
      navigate("/admin");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "ログインに失敗しました。";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            ログイン
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            管理画面にアクセスするにはログインが必要です
          </p>
        </div>

        {/* ローディング状態の視覚的フィードバック */}
        {loading && (
          <div className="flex items-center justify-center p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-blue-700 dark:text-blue-300">
              ログイン中...
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className={cn(
                "w-full px-4 py-3 border rounded-lg",
                "border-gray-300 dark:border-gray-600",
                "bg-white dark:bg-gray-700",
                "text-gray-900 dark:text-white",
                "placeholder-gray-500 dark:placeholder-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition duration-200",
              )}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={cn(
                "w-full px-4 py-3 border rounded-lg",
                "border-gray-300 dark:border-gray-600",
                "bg-white dark:bg-gray-700",
                "text-gray-900 dark:text-white",
                "placeholder-gray-500 dark:placeholder-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition duration-200",
              )}
              placeholder="パスワードを入力してください"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              role="alert"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className={cn(
              "w-full py-3 px-4 border border-transparent rounded-lg shadow-sm",
              "text-sm font-medium text-white",
              "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition duration-200 ease-in-out",
              loading && "cursor-wait",
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="mr-2" />
                ログイン中...
              </div>
            ) : (
              "ログイン"
            )}
          </button>
        </form>

        <div className="text-center space-y-2">
          <div>
            <Link
              to="/password/reset"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              パスワードをお忘れの方はこちら
            </Link>
          </div>
          <div>
            <Link
              to="/"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login;

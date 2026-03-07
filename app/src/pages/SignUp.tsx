// app/src/pages/SignUp.tsx
import Layout from "@/components/layouts/Layout";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthenticatedApi } from "@/api/client";
import LoadingSpinner from "@/components/atoms/LoadingSpinner";
import { cn } from "@/components/utils/cn";

const SignUp = () => {
  const api = useAuthenticatedApi();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (loading) return;

    // メールは空白除去、パスワードは意図的なスペースを許容
    if (!email.trim() || !password || !passwordConfirmation || !signupPassword) {
      setError("全てのフィールドを入力してください。");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("パスワードが一致しません。");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上である必要があります。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // メールアドレスのみ正規化（パスワードは意図的なスペースを許容）
      const normalizedEmail = email.trim();

      // サインアップ
      const signUpResponse = await api.authApi.signUp(
        normalizedEmail,
        password,
        passwordConfirmation,
        signupPassword,
      );

      if (!signUpResponse.ok) {
        setError(signUpResponse.error || "サインアップに失敗しました。");
        return;
      }

      // 204など「成功だがボディ無し」を許容
      if (signUpResponse.data == null) {
        navigate("/login");
        return;
      }

      const status = signUpResponse.data.status;
      const message = signUpResponse.data.message;

      if (status && status !== "success") {
        setError(message || "サインアップに失敗しました。");
        return;
      }

      // サインアップ成功後、ログインページへリダイレクト
      // （sign_upではJWT発行しない設計のため、明示的にログインが必要）
      navigate("/login");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "サインアップに失敗しました。";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit();
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
              サインアップ
            </h1>
            <p className="text-center text-gray-600 mb-8">
              新しいアカウントを作成してください
            </p>

            <form onSubmit={handleSignUp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード（確認）
                </label>
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  サインアップパスワード
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="管理者登録用パスワード"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  管理者登録に必要なパスワードを入力してください
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full py-2 px-4 rounded-lg font-semibold transition",
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white",
                )}
              >
                {loading ? <LoadingSpinner /> : "サインアップ"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                既にアカウントをお持ちですか？{" "}
                <Link to="/login" className="text-blue-600 hover:text-blue-700">
                  ログイン
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SignUp;

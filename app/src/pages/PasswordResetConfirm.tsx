// app/src/pages/PasswordResetConfirm.tsx
// メール内リンクから遷移する新パスワード設定画面
// URLクエリ ?reset_password_token=... を受け取り、新パスワードを設定する
import Layout from "@/components/layouts/Layout";
import { useState, useEffect } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import LoadingSpinner from "@/components/atoms/LoadingSpinner";
import { cn } from "@/components/utils/cn";
import { API_BASE } from "@/api/base";

const TOKEN_STORAGE_KEY = "reset_password_token";

const PasswordResetConfirm = () => {
  const [searchParams] = useSearchParams();
  // hash 変更にも追従するため React Router の location を依存に含める。
  // window.location.hash 直読みだと React に変更通知されず再 sync しないケースがある。
  const location = useLocation();
  // null は useEffect 実行前の「未確定」状態を表す。"" にすると初回レンダーで
  // `if (!token)` 分岐に入って一瞬「無効トークン」画面がフラッシュするのを避けるため。
  const [token, setToken] = useState<string | null>(null);

  // URL → sessionStorage の順でトークンを同期し、URL上のトークンは即座に除去する
  // マウント中に searchParams または hash が変化したときも追従する
  useEffect(() => {
    // backend のメールリンクはフラグメント (#reset_password_token=...) ベース。
    // クエリ文字列 (?reset_password_token=...) も後方互換のためフォールバック。
    // フラグメントを優先することで、サーバログ・Referer 経由の漏えいを最小化。
    //
    // URLSearchParams は HTML form encoding 仕様に従って "+" を空白として
    // デコードする。Devise の reset_password_token は base64 系で "+" を含むことが
    // あり、そのままだと壊れるため空白を "+" に戻して正規化する。
    // (backend が ERB::Util.url_encode で %2B にしている場合は影響しないが、
    //  defense-in-depth として常に補正する)
    const normalizeToken = (value: string | null) =>
      value ? value.replace(/ /g, "+") : null;

    const hashParams = new URLSearchParams(location.hash.slice(1));
    const tokenFromHash = normalizeToken(hashParams.get(TOKEN_STORAGE_KEY));
    const tokenFromQuery = normalizeToken(searchParams.get(TOKEN_STORAGE_KEY));
    const tokenFromUrl = tokenFromHash || tokenFromQuery;

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      // sessionStorage はプライベートブラウズや厳しいストレージ制限下で例外を投げ得る。
      // 失敗してもメイン処理は継続させ、URL からトークンが消えるだけの状態は避ける。
      try {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, tokenFromUrl);
        // reset_password_token のみを URL から外科的に除去する。
        // pathname だけに置き換えると、将来この画面に他のクエリ/ハッシュが
        // 付いたときにそれらまで巻き込んで消えてしまうため。
        const cleanedUrl = new URL(window.location.href);
        cleanedUrl.searchParams.delete(TOKEN_STORAGE_KEY);
        const remainingHash = new URLSearchParams(cleanedUrl.hash.slice(1));
        remainingHash.delete(TOKEN_STORAGE_KEY);
        const hashString = remainingHash.toString();
        const nextUrl = `${cleanedUrl.pathname}${cleanedUrl.search}${hashString ? `#${hashString}` : ""}`;

        // 第1引数は React Router の location.state を巻き込まないように
        // 既存の history.state を保持する（{} に置換すると遷移情報が失われる）。
        // 同時に resetPasswordTokenLoaded フラグを history.state に記録することで、
        // 「URL を浄化した直後の遷移」だけ sessionStorage の token 再利用を許可する
        // （URL に token が無い別訪問で古い token を誤って拾うのを防ぐ）。
        window.history.replaceState(
          { ...(window.history.state ?? {}), resetPasswordTokenLoaded: true },
          document.title,
          nextUrl,
        );
      } catch {
        // sessionStorage / history が使えない環境では URL を残してトークンを保持する
      }
      return;
    }
    // URL に token が無いときの sessionStorage 再利用は、直前に URL から
    // 取り込んで replaceState した場合 (resetPasswordTokenLoaded フラグ) に限定する。
    // それ以外では古い token の誤用を防ぐため明示的に破棄する。
    try {
      const canReuseStoredToken =
        window.history.state?.resetPasswordTokenLoaded === true;
      if (!canReuseStoredToken) {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      setToken(
        canReuseStoredToken
          ? sessionStorage.getItem(TOKEN_STORAGE_KEY) || ""
          : "",
      );
    } catch {
      setToken("");
    }
  }, [searchParams, location.hash]);

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // setLoading の反映前に連続クリックされた場合の多重送信は React state では
    // 防げない (state 更新は次のレンダーで反映)。DOM 直の form.dataset を
    // 同期フラグとして使うことで、同一レンダー内の二重 PATCH を確実に遮断する。
    // ワンタイムトークンの失効レース防止のため必須。
    const form = e.currentTarget;
    if (form.dataset.submitting === "true") {
      return;
    }

    // 検証は実際に送信する password そのものに対して行う。
    // 以前は trim().length で検証してたが、送信値は trim 前の生の password なので
    // 検証基準と送信値がズレていた（例: "      hello1" は trim 後 6文字で通って
    // 12文字のまま送られる）。
    // 空白のみの入力は別条件で弾く。
    if (password.trim().length === 0) {
      setError("パスワードを入力してください。");
      return;
    }
    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください。");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("パスワードが一致しません。");
      return;
    }

    form.dataset.submitting = "true";
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
        const apiErrors = Array.isArray(data.errors) ? data.errors : [];
        const errorMessage =
          apiErrors.length > 0
            ? apiErrors.join(", ")
            : "パスワードの更新に失敗しました。リンクの有効期限切れの可能性があります。";

        // トークン失効系の検知:
        //   1. 失効を意図する明確なステータスコード (401 = 未認証 / 410 = リソース消滅)
        //      400/404 は通常のリクエスト形式エラーやルート問題でも返るため、
        //      無条件で token 破棄すると正規ユーザーが復旧できなくなる
        //   2. errors 配列の文言が明確に reset_password_token に紐づく場合のみ
        //      → 「Password confirmation is invalid」のような通常のバリデーション失敗で
        //         誤って token を破棄しないよう、文言マッチは reset_password_token 関連に限定。
        const hasTokenError =
          [401, 410].includes(response.status) ||
          apiErrors.some((msg: unknown) => {
            const normalized = String(msg).toLowerCase();
            return (
              normalized.includes("reset_password_token") ||
              normalized.includes("reset password token") ||
              normalized.includes("expired token") ||
              normalized.includes("invalid token") ||
              normalized.includes("リセットパスワードトークン") ||
              normalized.includes("リセット用トークン") ||
              normalized.includes("期限切れ") ||
              normalized.includes("無効なトークン")
            );
          });

        if (hasTokenError) {
          try {
            sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          } catch {
            // ストレージ制限下でもエラー表示は継続する
          }
          setToken("");
        }
        setError(errorMessage);
        return;
      }

      // 成功後は sessionStorage のトークンを破棄（再利用防止）
      // ストレージ制限下で例外が出ても、更新成功画面は表示する
      try {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {
        // no-op
      }
      setSuccess(true);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      // 同期フラグを解除して再送信を可能にする
      form.dataset.submitting = "false";
      setLoading(false);
    }
  };

  // useEffect 実行前は何も描画しない（フラッシュ回避）
  if (token === null) {
    return null;
  }

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

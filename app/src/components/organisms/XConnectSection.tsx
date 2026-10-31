// app/src/components/organisms/XConnectSection.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import LoadingSpinner from "@/components/atoms/LoadingSpinner";
import { useAuthenticatedApi } from "@/api/client";
import { cn } from "@/components/utils/cn";
import {
  isTrustedAuthorizeUrl,
  parseXConnectResult,
  RESULT_QUERY_KEY,
  X_CONNECT_CONFIRM_MESSAGE,
  X_CONNECT_RESULT_MESSAGES,
  X_CONNECT_START_ERROR_MESSAGE,
  X_CONNECT_UNTRUSTED_URL_MESSAGE,
} from "@/components/utils/xConnect";

type Notice = { type: "success" | "error"; message: string };

type Props = {
  // テストで画面遷移を差し替えるための注入点。既定はブラウザの画面遷移。
  navigate?: (url: string) => void;
};

const defaultNavigate = (url: string) => window.location.assign(url);

// 管理画面の「Xと連携する」。記事の自動ツイートに使う X アカウントを、
// OAuth (Authorization Code + PKCE) で連携する。
// 流れ: ボタン → backend が認可URLを返す → X の認可画面 → backend の callback →
//       /admin?x_connect=success|denied|error に戻ってくる (この結果を表示する)。
const XConnectSection = ({ navigate = defaultNavigate }: Props) => {
  const { xApi } = useAuthenticatedApi();
  const [searchParams, setSearchParams] = useSearchParams();

  // 戻ってきた結果は、初回の描画時に URL から読み取って保持し、URL からは消す
  // (再読み込みや URL の共有で、同じ結果が繰り返し表示されないようにする)。
  const [notice, setNotice] = useState<Notice | null>(() => {
    const result = parseXConnectResult(searchParams.get(RESULT_QUERY_KEY));
    return result ? X_CONNECT_RESULT_MESSAGES[result] : null;
  });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!searchParams.has(RESULT_QUERY_KEY)) return;
    const next = new URLSearchParams(searchParams);
    next.delete(RESULT_QUERY_KEY);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // X の認可画面から「戻る」で復帰すると、ブラウザのキャッシュ (bfcache) から
  // 送信中のまま復元されることがある。その場合はボタンを押せる状態に戻す。
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setIsConnecting(false);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleConnect = async () => {
    if (!window.confirm(X_CONNECT_CONFIRM_MESSAGE)) return;

    setIsConnecting(true);
    setNotice(null);

    try {
      const response = await xApi.connect();
      if (!response.ok) {
        throw new Error(response.error || X_CONNECT_START_ERROR_MESSAGE);
      }

      const authorizeUrl = response.data?.authorize_url;
      if (!isTrustedAuthorizeUrl(authorizeUrl)) {
        throw new Error(X_CONNECT_UNTRUSTED_URL_MESSAGE);
      }

      // 遷移が始まるまでは送信中のままにして、二重に押されないようにする。
      navigate(authorizeUrl);
    } catch (error) {
      console.error("❌ Admin: X連携の開始エラー:", error);
      setNotice({ type: "error", message: X_CONNECT_START_ERROR_MESSAGE });
      setIsConnecting(false);
    }
  };

  return (
    <section
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8"
      aria-labelledby="x-connect-heading"
    >
      <h2
        id="x-connect-heading"
        className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4"
      >
        X（旧Twitter）連携
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        記事の自動ツイートに使うXアカウントを連携します。連携はこのブラウザで、5分以内に完了させてください。
      </p>
      <button
        type="button"
        onClick={handleConnect}
        disabled={isConnecting}
        aria-busy={isConnecting}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors",
          "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
          isConnecting
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700",
        )}
      >
        {isConnecting ? (
          <>
            <LoadingSpinner size="sm" />
            Xに移動中...
          </>
        ) : (
          "Xと連携する"
        )}
      </button>
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={cn(
            "mt-4 p-4 rounded-md",
            notice.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
              : "bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
          )}
        >
          <p>{notice.message}</p>
        </div>
      )}
    </section>
  );
};

export default XConnectSection;

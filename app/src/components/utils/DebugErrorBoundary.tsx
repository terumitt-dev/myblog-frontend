// app/src/components/utils/DebugErrorBoundary.tsx
import { ErrorBoundary } from "react-error-boundary";
import type { ReactNode } from "react";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900">
      <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
          エラーが発生しました
        </h1>

        {/* 開発環境でのみエラー詳細を表示（DebugErrorBoundaryの特徴を維持） */}
        <details className="mb-4">
          <summary className="cursor-pointer text-gray-700 dark:text-gray-300 font-semibold">
            エラー詳細を表示
          </summary>
          <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-700 rounded-sm text-xs overflow-auto text-gray-800 dark:text-gray-200">
            <strong>Error:</strong> {error.message}
            {error.stack && (
              <>
                <br />
                <strong>Stack Trace:</strong>
                <br />
                {error.stack}
              </>
            )}
          </pre>
        </details>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
          >
            ページを再読み込み
          </button>

          <button
            onClick={resetErrorBoundary}
            className="ml-2 px-4 py-2 bg-gray-600 text-white rounded-sm hover:bg-gray-700 transition-colors"
          >
            再試行
          </button>
        </div>

        {/* 本番環境向けのメッセージ */}
        {!import.meta.env.DEV && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            問題が継続する場合は、ページを再読み込みしてください。
          </p>
        )}
      </div>
    </div>
  );
};

interface Props {
  children: ReactNode;
}

// 新しい関数型実装
export const DebugErrorBoundary = ({ children }: Props) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // 既存のログ出力を維持（開発環境でのデバッグに特化）
        console.error("🚨 ErrorBoundary caught an error:", error, errorInfo);

        // 開発環境でのみ詳細なログを出力
        if (import.meta.env.DEV) {
          console.group("🐛 Debug Error Boundary - Detailed Error Info");
          console.error("Error Message:", error.message);
          console.error("Error Stack:", error.stack);
          console.error("Component Stack:", errorInfo.componentStack);
          console.groupEnd();
        }
      }}
      onReset={() => {
        // リセット時の処理
        if (import.meta.env.DEV) {
          console.log("🔄 DebugErrorBoundary reset triggered");
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// デフォルトエクスポートも維持（既存コードの互換性のため）
export default DebugErrorBoundary;

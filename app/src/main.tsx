// app/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// MSWの初期化（セキュリティ強化版）
async function enableMocking() {
  // ブラウザ以外ではMSWを初期化しない（SSR/テスト対策）
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // 明示的に許可された場合のみMSWを有効化
  if (import.meta.env.VITE_ENABLE_MSW !== "true") return;

  // 複数条件での厳格チェック
  const hostname = window.location.hostname;

  if (
    import.meta.env.PROD ||
    import.meta.env.MODE === "production" ||
    !import.meta.env.DEV ||
    hostname === "go-lilaregard.com" ||
    hostname === "www.go-lilaregard.com"
  ) {
    console.log("📦 Production mode: MSW disabled");
    return;
  }

  try {
    console.log("🔧 Development mode: Initializing MSW...");
    const { worker } = await import("./mocks/browser");

    // 強制的にMSWを開始（重複チェックを削除）
    await worker.start({
      onUnhandledRequest: "bypass", // 処理されないリクエストは通す
      quiet: false,
    });
    console.log("✅ MSW initialized successfully");

    // ハンドラーの確認
    console.log("📋 MSW handlers registered:", worker.listHandlers().length);
  } catch (error) {
    console.error("❌ MSW initialization failed:", error);
    // MSWが失敗してもアプリは起動する
  }
}

// アプリケーション起動
enableMocking()
  .then(() => {
    console.log("🚀 Starting React application...");
    const root = createRoot(document.getElementById("root")!);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log("✅ React application started");
  })
  .catch((error) => {
    console.error("💥 Failed to start application:", error);
  });

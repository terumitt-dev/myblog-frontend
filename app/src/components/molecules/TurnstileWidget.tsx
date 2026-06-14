// src/components/molecules/TurnstileWidget.tsx
import { useEffect, useRef } from "react";

// Cloudflare Turnstile の最小限の型定義。
// 公式 script を index.html から読み込む方式のため、グローバル window に
// turnstile オブジェクトが生える。npm の型パッケージに依存せず手書きで定義し、
// サプライチェーン経由のリスクを避けている。
type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "flexible" | "compact";
  appearance?: "always" | "execute" | "interaction-only";
};

type TurnstileApi = {
  render: (
    element: HTMLElement | string,
    options: TurnstileRenderOptions,
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type Props = {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  /**
   * widget 描画後に reset を呼びたい (submit 成功後など) 場合に渡す。
   * 値が変わった時に widget の token を破棄して再チャレンジを促す。
   */
  resetSignal?: number;
};

const TurnstileWidget = ({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  resetSignal,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // 初回マウント時の reset effect 実行を抑制するためのフラグ。
  // 初期 resetSignal が 0 など defined な値で渡された場合に widget 描画直後に
  // 不要な reset が走るのを防ぐ。
  const isFirstResetRunRef = useRef(true);

  // script は index.html で async defer 読み込み。マウント時点で
  // window.turnstile が未定義のケースがあるため、ready ポーリングで
  // 利用可能になってから render する。
  useEffect(() => {
    let cancelled = false;

    const renderWhenReady = () => {
      if (cancelled) return;
      if (!containerRef.current) return;
      if (!window.turnstile) {
        // 50ms 間隔で短時間だけポーリング (実用上 1〜2 回で resolve する)
        window.setTimeout(renderWhenReady, 50);
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onSuccess,
        "error-callback": onError,
        "expired-callback": onExpire,
      });
    };

    renderWhenReady();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // siteKey が動的に変わるケースは想定していないが、安全側で deps に含める
  }, [siteKey, onSuccess, onError, onExpire]);

  // resetSignal が変化したら widget を reset (新しい token を取得しなおす)。
  // 初回マウント時は (resetSignal の初期値が defined であっても) 実行しない
  // — widget 描画直後の不要な reset を防ぐ。
  useEffect(() => {
    if (isFirstResetRunRef.current) {
      isFirstResetRunRef.current = false;
      return;
    }
    if (resetSignal === undefined) return;
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  return <div ref={containerRef} />;
};

export default TurnstileWidget;

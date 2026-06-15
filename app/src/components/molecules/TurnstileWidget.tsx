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
  /**
   * Cloudflare Turnstile widget の表示テーマ。デフォルト "auto" で
   * OS / ブラウザのダークモード設定に追従する。本ブログは Tailwind の dark:
   * クラスで配色を切り替えているため、widget も追従させて見た目を統一する。
   */
  theme?: "light" | "dark" | "auto";
};

// script が広告ブロッカー / ネットワーク障害で読み込まれないケースでも
// ポーリングが永続化しないよう上限を設ける。50ms × 100 = 約 5 秒。
// この時間で window.turnstile が生えなければ onError を呼んで諦める。
const SCRIPT_READY_POLL_INTERVAL_MS = 50;
const SCRIPT_READY_MAX_RETRIES = 100;

const TurnstileWidget = ({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  resetSignal,
  theme = "auto",
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
  // ポーリングは SCRIPT_READY_MAX_RETRIES 回で打ち切り、それまでに script が
  // 来なければ onError を呼んで諦める (ad blocker や Cloudflare 障害対策)。
  useEffect(() => {
    let cancelled = false;
    let retries = 0;

    const renderWhenReady = () => {
      if (cancelled) return;
      if (!containerRef.current) return;
      if (!window.turnstile) {
        if (retries >= SCRIPT_READY_MAX_RETRIES) {
          onError?.();
          return;
        }
        retries += 1;
        window.setTimeout(renderWhenReady, SCRIPT_READY_POLL_INTERVAL_MS);
        return;
      }

      // render() は通常 widget id を返すだけだが、不正な siteKey や script 側の
      // 不具合で例外を投げるケースがある。catch せず外に伝播するとフォーム所属の
      // ページ全体が React error boundary or Vite の overlay で壊れて見えるため、
      // 例外時は onError に倒して既存のエラー表示パスに合流させる。
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onSuccess,
          "error-callback": onError,
          "expired-callback": onExpire,
          theme,
        });
      } catch {
        onError?.();
      }
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
  }, [siteKey, onSuccess, onError, onExpire, theme]);

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

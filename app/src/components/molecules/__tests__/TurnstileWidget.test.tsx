// app/src/components/molecules/__tests__/TurnstileWidget.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import TurnstileWidget from "../TurnstileWidget";

// window.turnstile (Cloudflare 公式 script が生やすグローバル) をモックする。
// 実 script を読み込まないので、jsdom 環境では手動で window.turnstile を
// 差し込んで render / remove / reset の呼び出しを検証する。
type TurnstileMock = {
  render: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  triggerSuccess: (token: string) => void;
  triggerError: () => void;
  triggerExpire: () => void;
};

const installTurnstileMock = (): TurnstileMock => {
  const callbacks: {
    success: ((token: string) => void) | null;
    error: (() => void) | null;
    expire: (() => void) | null;
  } = {
    success: null,
    error: null,
    expire: null,
  };

  const renderFn = vi.fn(
    (
      _el: HTMLElement,
      options: {
        callback?: (token: string) => void;
        "error-callback"?: () => void;
        "expired-callback"?: () => void;
      },
    ) => {
      callbacks.success = options.callback ?? null;
      callbacks.error = options["error-callback"] ?? null;
      callbacks.expire = options["expired-callback"] ?? null;
      return "widget-id-stub";
    },
  );
  const removeFn = vi.fn();
  const resetFn = vi.fn();

  (window as { turnstile?: unknown }).turnstile = {
    render: renderFn,
    remove: removeFn,
    reset: resetFn,
  };

  return {
    render: renderFn,
    remove: removeFn,
    reset: resetFn,
    triggerSuccess: (token: string) => callbacks.success?.(token),
    triggerError: () => callbacks.error?.(),
    triggerExpire: () => callbacks.expire?.(),
  };
};

describe("TurnstileWidget", () => {
  let mock: TurnstileMock;

  beforeEach(() => {
    mock = installTurnstileMock();
  });

  afterEach(() => {
    cleanup();
    delete (window as { turnstile?: unknown }).turnstile;
  });

  it("マウント時に window.turnstile.render を sitekey 付きで呼ぶこと", async () => {
    render(
      <TurnstileWidget siteKey="test-key" onSuccess={() => {}} />,
    );

    await waitFor(() => {
      expect(mock.render).toHaveBeenCalledTimes(1);
    });
    const renderArgs = mock.render.mock.calls[0]?.[1] as {
      sitekey: string;
    };
    expect(renderArgs.sitekey).toBe("test-key");
  });

  it("Cloudflare からの token 受領を onSuccess に伝播すること", async () => {
    const onSuccess = vi.fn();
    render(<TurnstileWidget siteKey="test-key" onSuccess={onSuccess} />);

    await waitFor(() => expect(mock.render).toHaveBeenCalled());
    act(() => {
      mock.triggerSuccess("token-abc");
    });

    expect(onSuccess).toHaveBeenCalledWith("token-abc");
  });

  it("onError / onExpire が指定されていれば widget から伝播されること", async () => {
    const onError = vi.fn();
    const onExpire = vi.fn();
    render(
      <TurnstileWidget
        siteKey="test-key"
        onSuccess={() => {}}
        onError={onError}
        onExpire={onExpire}
      />,
    );

    await waitFor(() => expect(mock.render).toHaveBeenCalled());
    act(() => {
      mock.triggerError();
      mock.triggerExpire();
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("アンマウント時に widget を remove すること (cleanup)", async () => {
    const { unmount } = render(
      <TurnstileWidget siteKey="test-key" onSuccess={() => {}} />,
    );

    await waitFor(() => expect(mock.render).toHaveBeenCalled());
    unmount();

    expect(mock.remove).toHaveBeenCalledWith("widget-id-stub");
  });

  it("resetSignal が変化すると window.turnstile.reset を呼ぶこと", async () => {
    const { rerender } = render(
      <TurnstileWidget
        siteKey="test-key"
        onSuccess={() => {}}
        resetSignal={0}
      />,
    );

    await waitFor(() => expect(mock.render).toHaveBeenCalled());
    // 初回 effect で reset は呼ばれない設計 (依存値が defined なだけでは reset しない)
    expect(mock.reset).not.toHaveBeenCalled();

    rerender(
      <TurnstileWidget
        siteKey="test-key"
        onSuccess={() => {}}
        resetSignal={1}
      />,
    );

    expect(mock.reset).toHaveBeenCalledWith("widget-id-stub");
  });

  it("window.turnstile 未定義の状態でも crash しないこと (script load 遅延)", () => {
    delete (window as { turnstile?: unknown }).turnstile;

    expect(() =>
      render(
        <TurnstileWidget siteKey="test-key" onSuccess={() => {}} />,
      ),
    ).not.toThrow();
  });

  it("theme prop を render に渡すこと (デフォルトは auto)", async () => {
    const { unmount } = render(
      <TurnstileWidget siteKey="test-key" onSuccess={() => {}} />,
    );
    await waitFor(() => expect(mock.render).toHaveBeenCalled());
    const defaultArgs = mock.render.mock.calls[0]?.[1] as { theme?: string };
    expect(defaultArgs.theme).toBe("auto");
    unmount();
    mock.render.mockClear();

    render(
      <TurnstileWidget
        siteKey="test-key"
        onSuccess={() => {}}
        theme="dark"
      />,
    );
    await waitFor(() => expect(mock.render).toHaveBeenCalled());
    const darkArgs = mock.render.mock.calls[0]?.[1] as { theme?: string };
    expect(darkArgs.theme).toBe("dark");
  });

  it("window.turnstile が一定時間生えなければ onError を呼んでポーリングを止めること", async () => {
    // script が永続的にロードされないケースをシミュレート。
    delete (window as { turnstile?: unknown }).turnstile;
    vi.useFakeTimers();

    const onError = vi.fn();
    render(
      <TurnstileWidget
        siteKey="test-key"
        onSuccess={() => {}}
        onError={onError}
      />,
    );

    // SCRIPT_READY_MAX_RETRIES (100) * SCRIPT_READY_POLL_INTERVAL_MS (50) = 5000ms
    // で諦める設計。余裕を持って 6 秒進める。
    await vi.advanceTimersByTimeAsync(6000);

    expect(onError).toHaveBeenCalledTimes(1);

    // さらに時間を進めても再度 onError が呼ばれないこと (ポーリングが止まっている)
    onError.mockClear();
    await vi.advanceTimersByTimeAsync(5000);
    expect(onError).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

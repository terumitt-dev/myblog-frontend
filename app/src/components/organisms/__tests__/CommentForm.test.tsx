// app/src/components/organisms/__tests__/CommentForm.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommentForm from "../CommentForm";

// CommentForm は TurnstileWidget を内部で描画するため、TurnstileWidget が依存する
// window.turnstile (Cloudflare 公式 script が生やすグローバル) をモックする。
// 実 script を読み込まないので、jsdom 環境で render / token 取得を再現する。
const installTurnstileMock = () => {
  const callbacks: {
    success: ((token: string) => void) | null;
    expire: (() => void) | null;
    error: (() => void) | null;
  } = {
    success: null,
    expire: null,
    error: null,
  };

  const renderFn = vi.fn(
    (
      _el: HTMLElement,
      options: {
        callback?: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
      },
    ) => {
      callbacks.success = options.callback ?? null;
      callbacks.expire = options["expired-callback"] ?? null;
      callbacks.error = options["error-callback"] ?? null;
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
    triggerExpire: () => callbacks.expire?.(),
    triggerError: () => callbacks.error?.(),
  };
};

describe("CommentForm", () => {
  let mock: ReturnType<typeof installTurnstileMock>;

  beforeEach(() => {
    mock = installTurnstileMock();
  });

  afterEach(() => {
    cleanup();
    delete (window as { turnstile?: unknown }).turnstile;
  });

  it("Turnstile 未完了の状態では送信ボタンが disabled になっていること", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<CommentForm onSubmit={onSubmit} onCancel={() => {}} />);

    await user.type(screen.getByPlaceholderText("ユーザ名"), "alice");
    await user.type(
      screen.getByPlaceholderText("コメントを入力"),
      "test content",
    );

    // 入力は揃っているが Turnstile 未完了なので submit は無効
    const submit = screen.getByRole("button", { name: "コメントを確定する" });
    expect(submit).toBeDisabled();

    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Turnstile token を受領後に送信できること, callback に token が渡ること", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<CommentForm onSubmit={onSubmit} onCancel={() => {}} />);

    await user.type(screen.getByPlaceholderText("ユーザ名"), "alice");
    await user.type(
      screen.getByPlaceholderText("コメントを入力"),
      "hello world",
    );

    // Cloudflare Turnstile からの token 受領を模擬
    act(() => {
      mock.triggerSuccess("turnstile-token-xyz");
    });

    const submit = screen.getByRole("button", { name: "コメントを確定する" });
    await waitFor(() => expect(submit).not.toBeDisabled());

    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      "alice",
      "hello world",
      "turnstile-token-xyz",
    );
  });

  it("token の有効期限切れで送信ボタンが再度 disabled になること", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<CommentForm onSubmit={onSubmit} onCancel={() => {}} />);

    await user.type(screen.getByPlaceholderText("ユーザ名"), "alice");
    await user.type(
      screen.getByPlaceholderText("コメントを入力"),
      "hello world",
    );

    // 一度 token を取得
    act(() => {
      mock.triggerSuccess("turnstile-token-xyz");
    });
    const submit = screen.getByRole("button", { name: "コメントを確定する" });
    await waitFor(() => expect(submit).not.toBeDisabled());

    // expired callback を模擬
    act(() => {
      mock.triggerExpire();
    });
    await waitFor(() => expect(submit).toBeDisabled());
  });

  it("onSubmit が失敗 (reject) した場合は入力欄を保持しつつ token を破棄して widget を reset し、再認証メッセージを表示すること", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("network failure"));
    const user = userEvent.setup();

    render(<CommentForm onSubmit={onSubmit} onCancel={() => {}} />);

    const nameInput = screen.getByPlaceholderText("ユーザ名");
    const commentInput = screen.getByPlaceholderText("コメントを入力");

    await user.type(nameInput, "alice");
    await user.type(commentInput, "retry-needed");
    act(() => {
      mock.triggerSuccess("token-retry");
    });

    const submit = screen.getByRole("button", { name: "コメントを確定する" });
    await waitFor(() => expect(submit).not.toBeDisabled());
    await user.click(submit);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    // Cloudflare Turnstile の token は single-use なので、失敗時は token を
    // 破棄 + widget reset して新しい token を取得しなおす設計。
    // 入力欄はユーザーの再入力を不要にするため保持する。
    expect(nameInput).toHaveValue("alice");
    expect(commentInput).toHaveValue("retry-needed");
    // token を捨てたので submit は再 disabled。
    expect(submit).toBeDisabled();
    // widget を reset して新 challenge を求めることを確認。
    await waitFor(() => {
      expect(mock.reset).toHaveBeenCalledWith("widget-id-stub");
    });
    // ユーザーに「再認証が必要」な旨を widget 直下に表示する
    // (error / expire と文言を分けることで原因を識別可能にする)。
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("投稿が失敗しました");
    expect(alert).toHaveTextContent("認証 widget を再度解いて");
    // error / expire 用文言と混ざらないことの担保
    expect(alert).not.toHaveTextContent("ネットワーク状況を確認");
    expect(alert).not.toHaveTextContent("有効期限が切れました");
  });

  it("失敗後に新しい token を取得すれば再投稿できること", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new Error("first try fails"))
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<CommentForm onSubmit={onSubmit} onCancel={() => {}} />);

    const nameInput = screen.getByPlaceholderText("ユーザ名");
    const commentInput = screen.getByPlaceholderText("コメントを入力");

    await user.type(nameInput, "alice");
    await user.type(commentInput, "retry-needed");

    // 1 回目: token A で submit → 失敗
    act(() => {
      mock.triggerSuccess("token-A");
    });
    const submit = screen.getByRole("button", { name: "コメントを確定する" });
    await waitFor(() => expect(submit).not.toBeDisabled());
    await user.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    // 失敗直後は再認証メッセージが表示される
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "投稿が失敗しました",
    );

    // 2 回目: 新しい token B を取得 → submit → 成功
    act(() => {
      mock.triggerSuccess("token-B");
    });
    // 新 token を受け取った時点で「再認証が必要」メッセージは消える
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    await waitFor(() => expect(submit).not.toBeDisabled());
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(2);
    // 2 回目の call は新 token (再利用していない) であることを確認
    expect(onSubmit).toHaveBeenNthCalledWith(2, "alice", "retry-needed", "token-B");
  });

  it("送信成功後に入力欄がクリアされること", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<CommentForm onSubmit={onSubmit} onCancel={() => {}} />);

    const nameInput = screen.getByPlaceholderText("ユーザ名");
    const commentInput = screen.getByPlaceholderText("コメントを入力");

    await user.type(nameInput, "alice");
    await user.type(commentInput, "first comment");
    act(() => {
      mock.triggerSuccess("turnstile-token-first");
    });

    const submit = screen.getByRole("button", { name: "コメントを確定する" });
    await waitFor(() => expect(submit).not.toBeDisabled());
    await user.click(submit);

    // 入力欄がクリアされ、token も無効化されるので submit は再度 disabled
    expect(nameInput).toHaveValue("");
    expect(commentInput).toHaveValue("");
    await waitFor(() => expect(submit).toBeDisabled());
  });

  it("Turnstile error 発生時に「読み込みに失敗」メッセージが表示されること", async () => {
    render(<CommentForm onSubmit={() => {}} onCancel={() => {}} />);

    // 初期状態ではメッセージは出ていない
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => {
      mock.triggerError();
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "認証 widget の読み込みに失敗しました",
    );
  });

  it("Turnstile expire 発生時には別の「有効期限切れ」メッセージが表示されること", async () => {
    render(<CommentForm onSubmit={() => {}} onCancel={() => {}} />);

    act(() => {
      mock.triggerExpire();
    });

    const alert = await screen.findByRole("alert");
    // expire はネットワーク障害ではないので、文言を別にして
    // ユーザーが原因を取り違えないようにする
    expect(alert).toHaveTextContent("認証の有効期限が切れました");
    // error 用文言は混ざらない
    expect(alert).not.toHaveTextContent("ネットワーク状況を確認");
  });

  it("エラーメッセージは新しい token 取得で消えること", async () => {
    render(<CommentForm onSubmit={() => {}} onCancel={() => {}} />);

    act(() => {
      mock.triggerError();
    });
    await screen.findByRole("alert");

    act(() => {
      mock.triggerSuccess("recovered-token");
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("disabled prop が true の時はあらゆる入力後も送信できないこと", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <CommentForm onSubmit={onSubmit} onCancel={() => {}} disabled={true} />,
    );

    await user.type(screen.getByPlaceholderText("ユーザ名"), "alice");
    await user.type(
      screen.getByPlaceholderText("コメントを入力"),
      "hello",
    );
    act(() => {
      mock.triggerSuccess("turnstile-token-xyz");
    });

    const submit = screen.getByRole("button", { name: "コメントを確定する" });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

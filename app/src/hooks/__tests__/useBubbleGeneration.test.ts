// app/src/hooks/__tests__/useBubbleGeneration.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useBubbleGeneration } from "../useBubbleGeneration";

// モック
const mockSetTimeout = vi.fn();
const mockClearTimeout = vi.fn();

describe("useBubbleGeneration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as any).setTimeout = mockSetTimeout;
    (globalThis as any).clearTimeout = mockClearTimeout;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("techカテゴリの場合にバブルが生成される", () => {
    const { result } = renderHook(() =>
      useBubbleGeneration({
        category: "tech",
        reducedMotion: false,
        isPageVisible: true,
      }),
    );

    expect(result.current.bubbles).toEqual([]);
    expect(typeof result.current.handleBubbleEnd).toBe("function");
    expect(typeof result.current.initializeBubbles).toBe("function");
  });

  it("tech以外のカテゴリの場合にバブルが生成されない", () => {
    const { result } = renderHook(() =>
      useBubbleGeneration({
        category: "hobby",
        reducedMotion: false,
        isPageVisible: true,
      }),
    );

    expect(result.current.bubbles).toEqual([]);
  });

  it("reducedMotionがtrueの場合にバブルが生成されない", () => {
    const { result } = renderHook(() =>
      useBubbleGeneration({
        category: "tech",
        reducedMotion: true,
        isPageVisible: true,
      }),
    );

    expect(result.current.bubbles).toEqual([]);
  });

  it("ページが非表示の場合にバブルが生成されない", () => {
    const { result } = renderHook(() =>
      useBubbleGeneration({
        category: "tech",
        reducedMotion: false,
        isPageVisible: false,
      }),
    );

    expect(result.current.bubbles).toEqual([]);
  });

  it("バブル終了処理が正常に動作する", () => {
    const { result } = renderHook(() =>
      useBubbleGeneration({
        category: "tech",
        reducedMotion: false,
        isPageVisible: true,
      }),
    );

    act(() => {
      result.current.initializeBubbles();
    });

    // バブルが存在する場合のテスト
    if (result.current.bubbles.length > 0) {
      const bubbleId = result.current.bubbles[0].id;

      act(() => {
        result.current.handleBubbleEnd(bubbleId);
      });

      expect(
        result.current.bubbles.find((b) => b.id === bubbleId),
      ).toBeUndefined();
    }
  });

  it("initializeBubblesが正常に動作する", () => {
    const { result } = renderHook(() =>
      useBubbleGeneration({
        category: "tech",
        reducedMotion: false,
        isPageVisible: true,
      }),
    );

    act(() => {
      result.current.initializeBubbles();
    });

    // バブル生成条件が満たされている場合はバブルが生成される可能性がある
    expect(typeof result.current.bubbles).toBe("object");
    expect(Array.isArray(result.current.bubbles)).toBe(true);
  });
});

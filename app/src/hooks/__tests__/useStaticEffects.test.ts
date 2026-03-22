// app/src/hooks/__tests__/useStaticEffects.test.ts
import { renderHook } from "@testing-library/react";
import { useStaticEffects } from "../useStaticEffects";
import { usePosts } from "../usePosts";
import { useSpiderEffects } from "../useSpiderEffects";
import { useSnailEffects } from "../useSnailEffects";
import { useCategoryValidation } from "../useCategoryValidation";
import { useAccessibility } from "../useAccessibility";
import { vi } from "vitest";

// 各フックのモック
vi.mock("../usePosts", () => ({
  usePosts: vi.fn(),
}));

vi.mock("../useSpiderEffects", () => ({
  useSpiderEffects: vi.fn(),
}));

vi.mock("../useSnailEffects", () => ({
  useSnailEffects: vi.fn(),
}));

vi.mock("../useCategoryValidation", () => ({
  useCategoryValidation: vi.fn(),
}));

vi.mock("../useAccessibility", () => ({
  useAccessibility: vi.fn(),
}));

describe("useStaticEffects", () => {
  beforeEach(() => {
    // 各モックフックの戻り値を設定
    (useAccessibility as any).mockReturnValue({
      reducedMotion: false,
      highContrast: false,

      focusVisible: false,
    });

    (usePosts as any).mockReturnValue({
      posts: [
        { id: 1, title: "Test Post", content: "Content", category: "tech" },
      ],
    });

    (useSpiderEffects as any).mockReturnValue({
      spiders: [{ id: 101, top: "10px", left: "20px", rotate: 45 }],
      spiderDisappearingIds: new Set([102]),
      handleSpiderClick: vi.fn(),
    });

    (useSnailEffects as any).mockReturnValue({
      snails: [{ id: 201, top: "30px", left: "40px", isMoved: false }],
      snailDisappearingIds: new Set([202]),
      handleSnailClick: vi.fn(),
      handleSnailHover: vi.fn(),
    });

    (useCategoryValidation as any).mockReturnValue({
      isValidCategory: vi.fn(
        (cat) => cat === "tech" || cat === "hobby" || cat === "other",
      ),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("すべての依存フックを正しくコンポーズする", () => {
    const category = "tech";
    const { result } = renderHook(() => useStaticEffects(category));

    // 各フックが適切に呼ばれることを確認
    expect(useAccessibility).toHaveBeenCalled();
    expect(usePosts).toHaveBeenCalledWith(category);
    expect(useSpiderEffects).toHaveBeenCalledWith(category, false);
    expect(useSnailEffects).toHaveBeenCalledWith(category, false);
    expect(useCategoryValidation).toHaveBeenCalled();

    // 戻り値が正しく結合されていることを確認
    expect(result.current).toEqual({
      posts: [
        { id: 1, title: "Test Post", content: "Content", category: "tech" },
      ],
      spiders: [{ id: 101, top: "10px", left: "20px", rotate: 45 }],
      snails: [{ id: 201, top: "30px", left: "40px", isMoved: false }],
      isLoading: undefined,
      reducedMotion: false,
      spiderDisappearingIds: new Set([102]),
      snailDisappearingIds: new Set([202]),
      handleSpiderClick: expect.any(Function),
      handleSnailClick: expect.any(Function),
      handleSnailHover: expect.any(Function),
      isValidCategory: expect.any(Function),
    });
  });
  it("アクセシビリティ設定がサブフックに正しく渡される", () => {
    // reducedMotionをtrueに設定
    (useAccessibility as any).mockReturnValue({
      reducedMotion: true,
      highContrast: false,

      focusVisible: false,
    });

    const category = "hobby";
    renderHook(() => useStaticEffects(category));

    // reducedMotion設定が各エフェクトフックに渡されること
    expect(useSpiderEffects).toHaveBeenCalledWith(category, true);
    expect(useSnailEffects).toHaveBeenCalledWith(category, true);
  });

  it("カテゴリが変更された場合、依存フックに正しく伝播する", () => {
    // 初回レンダリング
    const { rerender } = renderHook(
      (props) => useStaticEffects(props.category),
      { initialProps: { category: "tech" } },
    );

    // カテゴリ変更で再レンダリング
    rerender({ category: "hobby" });

    // 新しいカテゴリで各フックが呼ばれること
    expect(usePosts).toHaveBeenCalledWith("hobby");
    expect(useSpiderEffects).toHaveBeenCalledWith("hobby", false);
    expect(useSnailEffects).toHaveBeenCalledWith("hobby", false);
  });
});

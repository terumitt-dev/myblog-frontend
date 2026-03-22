// app/src/hooks/__tests__/usePosts.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { usePosts } from "../usePosts";
import { vi, beforeEach, afterEach } from "vitest";

// API_BASEをモック
vi.mock("@/api/base", () => ({
  API_BASE: "http://localhost:3000/api",
  getApiBase: () => "http://localhost:3000/api",
}));

// fetchモック
const mockFetch = vi.fn();

describe("usePosts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("APIから投稿データを取得する", async () => {
    const mockResponse = {
      blogs: [
        {
          id: 1,
          title: "Tech Post",
          content: "Content",
          category: "tech",
          category_name: "tech",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => usePosts("tech"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.posts.length).toBe(1);
    expect(result.current.posts[0].title).toBe("Tech Post");
    expect(result.current.error).toBeNull();
  });

  it("カテゴリパラメータをURLに含める", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ blogs: [] }),
    });

    renderHook(() => usePosts("hobby"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("category=hobby");
    expect(url).toContain("limit=20");
  });

  it("カテゴリなしの場合もlimitパラメータを含める", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ blogs: [] }),
    });

    renderHook(() => usePosts());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("limit=20");
    expect(url).not.toContain("category=");
  });

  it("APIエラー時にエラーを返す", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => usePosts("tech"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.posts).toEqual([]);
  });

  it("ネットワークエラー時にエラーを返す", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => usePosts("tech"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.posts).toEqual([]);
  });
});

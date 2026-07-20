import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWatchlist } from "@/hooks/useWatchlist";

// ---- モック設定 ----

const { mockUseSWR, mockPost, mockDelete, mockPut, mockGet } = vi.hoisted(() => ({
  mockUseSWR: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
  mockPut: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock("swr", () => ({ default: mockUseSWR }));

vi.mock("@/lib/api", () => ({
  default: { GET: mockGet, POST: mockPost, DELETE: mockDelete, PUT: mockPut },
  CSRF_HEADER: { "X-CSRF-Token": "" },
}));

// ---- テストデータ ----

const ITEMS = [
  { id: 1, symbol_code: "AAPL", sort_key: 1 },
  { id: 2, symbol_code: "GOOGL", sort_key: 2 },
];

// ---- テスト ----

describe("useWatchlist", () => {
  let mockMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate = vi.fn();
    mockUseSWR.mockReturnValue({
      data: ITEMS,
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    });
  });

  describe("戻り値", () => {
    it("items・isLoading・error を返す", () => {
      const { result } = renderHook(() => useWatchlist());

      expect(result.current.items).toEqual(ITEMS);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    it("data が undefined のとき items は空配列を返す", () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: undefined,
        mutate: mockMutate,
      });

      const { result } = renderHook(() => useWatchlist());

      expect(result.current.items).toEqual([]);
    });
  });

  describe("addSymbol", () => {
    it("mutate に正しいオプティミスティックデータを渡す", async () => {
      mockMutate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWatchlist());

      await act(async () => {
        await result.current.addSymbol("TSLA");
      });

      expect(mockMutate).toHaveBeenCalledOnce();
      const [, options] = mockMutate.mock.calls[0];
      // 既存アイテム + 新規アイテムが末尾に追加されている
      expect(options.optimisticData).toHaveLength(3);
      expect(options.optimisticData[2]).toMatchObject({
        symbol_code: "TSLA",
        sort_key: 3, // 既存 2 件の次
      });
      expect(options.rollbackOnError).toBe(true);
    });

    it("mutate コールバック内で POST /v1/watchlist を呼ぶ", async () => {
      mockPost.mockResolvedValue({ data: null, error: null });
      mockGet.mockResolvedValue({ data: [...ITEMS, { id: 3, symbol_code: "TSLA", sort_key: 3 }], error: null });
      // mutate の第一引数（async 関数）を実際に実行する
      mockMutate.mockImplementation(async (fn) => fn());

      const { result } = renderHook(() => useWatchlist());

      await act(async () => {
        await result.current.addSymbol("TSLA");
      });

      expect(mockPost).toHaveBeenCalledWith("/v1/watchlist", {
        params: { header: { "X-CSRF-Token": "" } },
        body: { symbol_code: "TSLA" },
      });
    });

    it("API エラー時に mutate コールバックが throw する", async () => {
      mockPost.mockResolvedValue({ data: null, error: { message: "server error" } });
      mockMutate.mockImplementation(async (fn) => fn());

      const { result } = renderHook(() => useWatchlist());

      await expect(
        act(async () => {
          await result.current.addSymbol("TSLA");
        })
      ).rejects.toThrow("銘柄の追加に失敗しました");
    });
  });

  describe("removeSymbol", () => {
    it("mutate に対象を除いたオプティミスティックデータを渡す", async () => {
      mockMutate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWatchlist());

      await act(async () => {
        await result.current.removeSymbol("AAPL");
      });

      const [, options] = mockMutate.mock.calls[0];
      expect(options.optimisticData).toHaveLength(1);
      expect(options.optimisticData[0].symbol_code).toBe("GOOGL");
      expect(options.rollbackOnError).toBe(true);
    });

    it("mutate コールバック内で DELETE /v1/watchlist/{code} を呼ぶ", async () => {
      mockDelete.mockResolvedValue({ data: null, error: null });
      mockGet.mockResolvedValue({ data: [ITEMS[1]], error: null });
      mockMutate.mockImplementation(async (fn) => fn());

      const { result } = renderHook(() => useWatchlist());

      await act(async () => {
        await result.current.removeSymbol("AAPL");
      });

      expect(mockDelete).toHaveBeenCalledWith("/v1/watchlist/{code}", {
        params: { path: { code: "AAPL" }, header: { "X-CSRF-Token": "" } },
      });
    });

    it("API エラー時に mutate コールバックが throw する", async () => {
      mockDelete.mockResolvedValue({ data: null, error: { message: "not found" } });
      mockMutate.mockImplementation(async (fn) => fn());

      const { result } = renderHook(() => useWatchlist());

      await expect(
        act(async () => {
          await result.current.removeSymbol("AAPL");
        })
      ).rejects.toThrow("銘柄の削除に失敗しました");
    });
  });

  describe("reorder", () => {
    it("codes の順序に従い sort_key を 1 始まりで振り直す", async () => {
      mockMutate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWatchlist());

      await act(async () => {
        await result.current.reorder(["GOOGL", "AAPL"]);
      });

      const [, options] = mockMutate.mock.calls[0];
      expect(options.optimisticData).toEqual([
        { id: 2, symbol_code: "GOOGL", sort_key: 1 },
        { id: 1, symbol_code: "AAPL", sort_key: 2 },
      ]);
      expect(options.rollbackOnError).toBe(true);
    });

    it("mutate コールバック内で PUT /v1/watchlist/order を呼ぶ", async () => {
      mockPut.mockResolvedValue({ data: null, error: null });
      mockGet.mockResolvedValue({ data: [ITEMS[1], ITEMS[0]], error: null });
      mockMutate.mockImplementation(async (fn) => fn());

      const { result } = renderHook(() => useWatchlist());

      await act(async () => {
        await result.current.reorder(["GOOGL", "AAPL"]);
      });

      expect(mockPut).toHaveBeenCalledWith("/v1/watchlist/order", {
        params: { header: { "X-CSRF-Token": "" } },
        body: { codes: ["GOOGL", "AAPL"] },
      });
    });

    it("API エラー時に mutate コールバックが throw する", async () => {
      mockPut.mockResolvedValue({ data: null, error: { message: "server error" } });
      mockMutate.mockImplementation(async (fn) => fn());

      const { result } = renderHook(() => useWatchlist());

      await expect(
        act(async () => {
          await result.current.reorder(["GOOGL", "AAPL"]);
        })
      ).rejects.toThrow("並び替えに失敗しました");
    });
  });
});

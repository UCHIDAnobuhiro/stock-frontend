import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { SWRConfig } from "swr";
import { createElement, type ReactNode } from "react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { ApiError } from "@/lib/api";

// ---- モック設定 ----
// SWR は実物を使い、fetch レイヤー（lib/api.ts）だけをモックする。
// これにより「操作後に items がどうなるか」という外部から見た振る舞いを検証できる。

const { mockPost, mockDelete, mockPut, mockGet } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
  mockPut: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    default: { GET: mockGet, POST: mockPost, DELETE: mockDelete, PUT: mockPut },
  };
});

// ---- テストデータ ----

const ITEMS = [
  { id: 1, symbol_code: "AAPL", sort_key: 1 },
  { id: 2, symbol_code: "GOOGL", sort_key: 2 },
];

// テストごとに新しいキャッシュを使い、テスト間の汚染を防ぐ
function wrapper({ children }: { children: ReactNode }) {
  return createElement(SWRConfig, { value: { provider: () => new Map() } }, children);
}

// ---- テスト ----

describe("useWatchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: ITEMS, error: null, response: { status: 200 } });
  });

  describe("戻り値", () => {
    it("items・isLoading・error を返す", async () => {
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toEqual(ITEMS);
      expect(result.current.error).toBeUndefined();
    });

    it("初回フェッチ完了前は items が空配列を返す", () => {
      const { result } = renderHook(() => useWatchlist(), { wrapper });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("addSymbol", () => {
    it("追加した銘柄が末尾に反映される", async () => {
      mockPost.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      mockGet.mockResolvedValue({
        data: [...ITEMS, { id: 3, symbol_code: "TSLA", sort_key: 3 }],
        error: null,
        response: { status: 200 },
      });

      await act(async () => {
        await result.current.addSymbol("TSLA");
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[2]).toMatchObject({ symbol_code: "TSLA", sort_key: 3 });
    });

    it("確定前はオプティミスティックに末尾へ一時追加され、確定後はサーバーの正式データに置き換わる", async () => {
      let resolvePost!: (value: { data: null; error: null }) => void;
      mockPost.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePost = resolve;
          })
      );

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let addPromise!: Promise<void>;
      act(() => {
        addPromise = result.current.addSymbol("TSLA");
      });

      // POST 未確定の間、オプティミスティックな一時アイテムが末尾に反映される
      await waitFor(() => expect(result.current.items).toHaveLength(3));
      expect(result.current.items[2]).toMatchObject({ symbol_code: "TSLA", sort_key: 3 });

      mockGet.mockResolvedValue({
        data: [...ITEMS, { id: 3, symbol_code: "TSLA", sort_key: 3 }],
        error: null,
        response: { status: 200 },
      });

      await act(async () => {
        resolvePost({ data: null, error: null });
        await addPromise;
      });

      expect(result.current.items[2]).toMatchObject({ id: 3, symbol_code: "TSLA", sort_key: 3 });
    });

    it("連続で追加しても、直前の追加分を土台に次の一時アイテムを積める（stale closure 回避）", async () => {
      mockPost.mockResolvedValue({ data: null, error: null });
      mockGet
        .mockResolvedValueOnce({ data: ITEMS, error: null, response: { status: 200 } })
        .mockResolvedValueOnce({
          data: [...ITEMS, { id: 3, symbol_code: "TSLA", sort_key: 3 }],
          error: null,
          response: { status: 200 },
        })
        .mockResolvedValue({
          data: [...ITEMS, { id: 3, symbol_code: "TSLA", sort_key: 3 }, { id: 4, symbol_code: "MSFT", sort_key: 4 }],
          error: null,
          response: { status: 200 },
        });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addSymbol("TSLA");
      });
      await act(async () => {
        await result.current.addSymbol("MSFT");
      });

      expect(result.current.items).toHaveLength(4);
      expect(result.current.items[2]).toMatchObject({ symbol_code: "TSLA" });
      expect(result.current.items[3]).toMatchObject({ symbol_code: "MSFT" });
    });

    it("POST /v1/watchlist を正しいパラメータで呼ぶ", async () => {
      mockPost.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addSymbol("TSLA");
      });

      expect(mockPost).toHaveBeenCalledWith("/v1/watchlist", {
        params: { header: { "X-CSRF-Token": "" } },
        body: { symbol_code: "TSLA" },
      });
    });

    it("API エラー時に addSymbol が失敗メッセージで reject し、items は元の状態にロールバックされる", async () => {
      mockPost.mockResolvedValue({ data: null, error: { message: "server error" }, response: { status: 400 } });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.addSymbol("TSLA");
        })
      ).rejects.toThrow("銘柄の追加に失敗しました");

      expect(result.current.items).toEqual(ITEMS);
    });

    it("403 のとき共通の拒否メッセージで reject する", async () => {
      mockPost.mockResolvedValue({ data: null, error: {}, response: { status: 403 } });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.addSymbol("TSLA");
        })
      ).rejects.toThrow("リクエストが拒否されました。ページを再読み込みして再度お試しください");
    });

    it("reject されるエラーは status を保持した ApiError インスタンスである", async () => {
      mockPost.mockResolvedValue({ data: null, error: {}, response: { status: 500 } });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.addSymbol("TSLA");
        } catch (e) {
          caught = e;
        }
      });

      expect(caught).toBeInstanceOf(ApiError);
      expect((caught as ApiError).status).toBe(500);
    });
  });

  describe("removeSymbol", () => {
    it("削除した銘柄が items から消える", async () => {
      mockDelete.mockResolvedValue({ data: null, error: null });
      mockGet.mockResolvedValue({ data: [ITEMS[1]], error: null, response: { status: 200 } });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.removeSymbol("AAPL");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].symbol_code).toBe("GOOGL");
    });

    it("DELETE /v1/watchlist/{code} を正しいパラメータで呼ぶ", async () => {
      mockDelete.mockResolvedValue({ data: null, error: null });
      mockGet.mockResolvedValue({ data: [ITEMS[1]], error: null, response: { status: 200 } });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.removeSymbol("AAPL");
      });

      expect(mockDelete).toHaveBeenCalledWith("/v1/watchlist/{code}", {
        params: { path: { code: "AAPL" }, header: { "X-CSRF-Token": "" } },
      });
    });

    it("API エラー時に removeSymbol が失敗メッセージで reject し、items は元の状態にロールバックされる", async () => {
      mockDelete.mockResolvedValue({ data: null, error: { message: "not found" }, response: { status: 400 } });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.removeSymbol("AAPL");
        })
      ).rejects.toThrow("銘柄の削除に失敗しました");

      expect(result.current.items).toEqual(ITEMS);
    });
  });

  describe("reorder", () => {
    it("codes の順序に従い sort_key を 1 始まりで振り直す", async () => {
      mockPut.mockResolvedValue({ data: null, error: null });
      mockGet.mockResolvedValue({
        data: [
          { id: 2, symbol_code: "GOOGL", sort_key: 1 },
          { id: 1, symbol_code: "AAPL", sort_key: 2 },
        ],
        error: null,
        response: { status: 200 },
      });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.reorder(["GOOGL", "AAPL"]);
      });

      expect(result.current.items).toEqual([
        { id: 2, symbol_code: "GOOGL", sort_key: 1 },
        { id: 1, symbol_code: "AAPL", sort_key: 2 },
      ]);
    });

    it("並び替え確定前は、現在のキャッシュに存在しないコードを含めても架空アイテムを作らず除外した状態が一時反映される", async () => {
      let resolvePut!: (value: { data: null; error: null }) => void;
      mockPut.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePut = resolve;
          })
      );

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let reorderPromise!: Promise<void>;
      act(() => {
        reorderPromise = result.current.reorder(["GOOGL", "AAPL", "UNKNOWN"]);
      });

      await waitFor(() =>
        expect(result.current.items).toEqual([
          { id: 2, symbol_code: "GOOGL", sort_key: 1 },
          { id: 1, symbol_code: "AAPL", sort_key: 2 },
        ])
      );

      mockGet.mockResolvedValue({
        data: [
          { id: 2, symbol_code: "GOOGL", sort_key: 1 },
          { id: 1, symbol_code: "AAPL", sort_key: 2 },
        ],
        error: null,
        response: { status: 200 },
      });

      await act(async () => {
        resolvePut({ data: null, error: null });
        await reorderPromise;
      });
    });

    it("PUT /v1/watchlist/order を正しいパラメータで呼ぶ", async () => {
      mockPut.mockResolvedValue({ data: null, error: null });
      mockGet.mockResolvedValue({ data: [ITEMS[1], ITEMS[0]], error: null, response: { status: 200 } });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.reorder(["GOOGL", "AAPL"]);
      });

      expect(mockPut).toHaveBeenCalledWith("/v1/watchlist/order", {
        params: { header: { "X-CSRF-Token": "" } },
        body: { codes: ["GOOGL", "AAPL"] },
      });
    });

    it("API エラー時に reorder が失敗メッセージで reject し、items は元の状態にロールバックされる", async () => {
      mockPut.mockResolvedValue({ data: null, error: { message: "server error" }, response: { status: 400 } });

      const { result } = renderHook(() => useWatchlist(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.reorder(["GOOGL", "AAPL"]);
        })
      ).rejects.toThrow("並び替えに失敗しました");

      expect(result.current.items).toEqual(ITEMS);
    });
  });

  describe("fetchWatchlist（フェッチャー）", () => {
    it("404 のとき「データが見つかりませんでした」を含む ApiError を error に設定する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 404 } });

      const { result } = renderHook(() => useWatchlist(), { wrapper });

      await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiError));

      expect((result.current.error as ApiError).message).toBe("データが見つかりませんでした");
    });
  });
});

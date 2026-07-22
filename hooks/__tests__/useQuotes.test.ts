import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useQuotes } from "@/hooks/useQuotes";
import { ApiError } from "@/lib/api";

// ---- モック設定 ----

const { mockUseSWR, mockGet } = vi.hoisted(() => ({
  mockUseSWR: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock("swr", () => ({ default: mockUseSWR }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, default: { GET: mockGet } };
});

// ---- テスト ----

describe("useQuotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SWR キーの制御", () => {
    it("codes が空配列のとき useSWR に null キーを渡してフェッチを無効化する", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      renderHook(() => useQuotes([]));

      const [key] = mockUseSWR.mock.calls[0];
      expect(key).toBeNull();
    });

    it("codes が指定されたとき useSWR に正しいキータプルを渡す（デフォルトの interval・bars）", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      renderHook(() => useQuotes(["AAPL", "GOOGL"]));

      const [key] = mockUseSWR.mock.calls[0];
      expect(key).toEqual(["/v1/quotes", "AAPL,GOOGL", "1day", 0]);
    });

    it("interval・bars を指定するとキーに反映される", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      renderHook(() => useQuotes(["AAPL"], { interval: "1week", bars: 60 }));

      const [key] = mockUseSWR.mock.calls[0];
      expect(key).toEqual(["/v1/quotes", "AAPL", "1week", 60]);
    });

    it("codes の並び順に依存せず同じキーになる（ソートして構築される）", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      renderHook(() => useQuotes(["GOOGL", "AAPL"]));
      const [keyA] = mockUseSWR.mock.calls[0];

      renderHook(() => useQuotes(["AAPL", "GOOGL"]));
      const [keyB] = mockUseSWR.mock.calls[1];

      expect(keyA).toEqual(keyB);
      expect(keyA).toEqual(["/v1/quotes", "AAPL,GOOGL", "1day", 0]);
    });
  });

  describe("戻り値", () => {
    it("data があるとき code をキーにした Map を返す", () => {
      const quotes = [
        { code: "AAPL", time: "2024-01-15", close: 150, prev_close: 148, change: 2, change_percent: 1.35 },
        { code: "GOOGL", time: "2024-01-15", close: 2800, prev_close: 2750, change: 50, change_percent: 1.82 },
      ];
      mockUseSWR.mockReturnValue({ data: quotes, isLoading: false, error: undefined });

      const { result } = renderHook(() => useQuotes(["AAPL", "GOOGL"]));

      expect(result.current.quotes.get("AAPL")).toEqual(quotes[0]);
      expect(result.current.quotes.get("GOOGL")).toEqual(quotes[1]);
      expect(result.current.quotes.size).toBe(2);
    });

    it("data が undefined のとき quotes は空の Map を返す", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      const { result } = renderHook(() => useQuotes(["AAPL"]));

      expect(result.current.quotes.size).toBe(0);
    });

    it("isLoading と error が useSWR の値をそのまま返す", () => {
      const error = new Error("fetch error");
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error });

      const { result } = renderHook(() => useQuotes(["AAPL"]));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(error);
    });
  });

  describe("SWR オプション", () => {
    it("revalidateOnFocus: false が渡される", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      renderHook(() => useQuotes(["AAPL"]));

      const [, , options] = mockUseSWR.mock.calls[0];
      expect(options.revalidateOnFocus).toBe(false);
    });
  });

  describe("fetchQuotes（フェッチャー）", () => {
    function getFetcher(codes: string[] = ["AAPL"]) {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });
      renderHook(() => useQuotes(codes));
      const [, fetcher] = mockUseSWR.mock.calls[0];
      return fetcher as (key: [string, string, string, number]) => Promise<unknown>;
    }

    it("成功時は data をそのまま返す", async () => {
      const quotes = [
        { code: "AAPL", time: "2024-01-15", close: 150, prev_close: 148, change: 2, change_percent: 1.35 },
      ];
      mockGet.mockResolvedValue({ data: quotes, error: undefined, response: { status: 200 } });

      const result = await getFetcher()(["/v1/quotes", "AAPL", "1day", 0]);

      expect(result).toEqual(quotes);
    });

    it("リクエストパラメータに codes・interval・bars を渡す", async () => {
      mockGet.mockResolvedValue({ data: [], error: undefined, response: { status: 200 } });

      await getFetcher()(["/v1/quotes", "AAPL,GOOGL", "1week", 60]);

      expect(mockGet).toHaveBeenCalledWith("/v1/quotes", {
        params: { query: { codes: "AAPL,GOOGL", interval: "1week", bars: 60 } },
      });
    });

    it("404 のとき「データが見つかりませんでした」を含む ApiError を throw する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 404 } });

      await expect(getFetcher()(["/v1/quotes", "AAPL", "1day", 0])).rejects.toThrow(
        "データが見つかりませんでした"
      );
    });

    it("500 のときサーバーエラーメッセージの ApiError を throw する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 500 } });

      await expect(getFetcher()(["/v1/quotes", "AAPL", "1day", 0])).rejects.toThrow(
        "サーバーエラーが発生しました。時間をおいて再度お試しください"
      );
    });

    it("マッピング外のステータスのときデフォルトメッセージの ApiError を throw する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 400 } });

      const error = await getFetcher()(["/v1/quotes", "AAPL", "1day", 0]).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
      expect((error as ApiError).message).toBe("株価サマリーの取得に失敗しました");
    });

    it("codes が51件以上のとき50件ずつのチャンクに分割してリクエストし、結果をマージした Map を返す", async () => {
      const codesList = Array.from({ length: 51 }, (_, i) => `CODE${i}`);

      mockGet.mockImplementation(async (_path: string, options: { params: { query: { codes: string } } }) => {
        const requestedCodes = options.params.query.codes.split(",");
        const data = requestedCodes.map((code) => ({
          code,
          time: "2024-01-15",
          close: 100,
          prev_close: 99,
          change: 1,
          change_percent: 1.01,
        }));
        return { data, error: undefined, response: { status: 200 } };
      });

      const result = (await getFetcher(codesList)(["/v1/quotes", codesList.join(","), "1day", 0])) as Array<{
        code: string;
      }>;

      expect(mockGet).toHaveBeenCalledTimes(2);
      const requestedCodesPerCall = mockGet.mock.calls.map(
        ([, options]: [string, { params: { query: { codes: string } } }]) =>
          options.params.query.codes.split(",")
      );
      expect(requestedCodesPerCall[0]).toHaveLength(50);
      expect(requestedCodesPerCall[1]).toHaveLength(1);
      for (const requestedCodes of requestedCodesPerCall) {
        expect(requestedCodes.length).toBeLessThanOrEqual(50);
      }

      expect(result).toHaveLength(51);
      expect(new Set(result.map((q) => q.code))).toEqual(new Set(codesList));
    });
  });
});

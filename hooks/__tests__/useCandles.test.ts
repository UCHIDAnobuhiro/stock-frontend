import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCandles } from "@/hooks/useCandles";
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

// useSelectedSymbol は型のみ使用するためモック不要

// ---- テスト ----

describe("useCandles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SWR キーの制御", () => {
    it("code が null のとき useSWR に null キーを渡してフェッチを無効化する", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      renderHook(() => useCandles(null, "1day"));

      const [key] = mockUseSWR.mock.calls[0];
      expect(key).toBeNull();
    });

    it("code が指定されたとき useSWR に正しいキータプルを渡す", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      renderHook(() => useCandles("AAPL", "1week"));

      const [key] = mockUseSWR.mock.calls[0];
      expect(key).toEqual(["/v1/candles", "AAPL", "1week"]);
    });
  });

  describe("戻り値", () => {
    it("data があるとき candles にそのまま返す", () => {
      const candles = [
        { time: "2024-01-01", open: 100, high: 110, low: 90, close: 105, volume: 1000 },
      ];
      mockUseSWR.mockReturnValue({ data: candles, isLoading: false, error: undefined });

      const { result } = renderHook(() => useCandles("AAPL", "1day"));

      expect(result.current.candles).toEqual(candles);
    });

    it("data が undefined のとき candles は空配列を返す", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      const { result } = renderHook(() => useCandles("AAPL", "1day"));

      expect(result.current.candles).toEqual([]);
    });

    it("isLoading と error が useSWR の値をそのまま返す", () => {
      const error = new Error("fetch error");
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error });

      const { result } = renderHook(() => useCandles("AAPL", "1day"));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(error);
    });
  });

  describe("SWR オプション", () => {
    it("revalidateOnFocus: false が渡される", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      renderHook(() => useCandles("AAPL", "1day"));

      const [, , options] = mockUseSWR.mock.calls[0];
      expect(options.revalidateOnFocus).toBe(false);
    });
  });

  describe("fetchCandles（フェッチャー）", () => {
    function getFetcher() {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });
      renderHook(() => useCandles("AAPL", "1day"));
      const [, fetcher] = mockUseSWR.mock.calls[0];
      return fetcher as (key: [string, string, string]) => Promise<unknown>;
    }

    it("成功時は data をそのまま返す", async () => {
      const candles = [{ time: "2024-01-01", open: 100, high: 110, low: 90, close: 105, volume: 1000 }];
      mockGet.mockResolvedValue({ data: candles, error: undefined, response: { status: 200 } });

      const result = await getFetcher()(["/v1/candles", "AAPL", "1day"]);

      expect(result).toEqual(candles);
    });

    it("404 のとき「データが見つかりませんでした」を含む ApiError を throw する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 404 } });

      await expect(getFetcher()(["/v1/candles", "AAPL", "1day"])).rejects.toThrow(
        "データが見つかりませんでした"
      );
    });

    it("500 のときサーバーエラーメッセージの ApiError を throw する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 500 } });

      await expect(getFetcher()(["/v1/candles", "AAPL", "1day"])).rejects.toThrow(
        "サーバーエラーが発生しました。時間をおいて再度お試しください"
      );
    });

    it("403 のとき共通の拒否メッセージの ApiError を throw する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 403 } });

      await expect(getFetcher()(["/v1/candles", "AAPL", "1day"])).rejects.toThrow(
        "リクエストが拒否されました。ページを再読み込みして再度お試しください"
      );
    });

    it("マッピング外のステータスのときデフォルトメッセージの ApiError を throw する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 400 } });

      const error = await getFetcher()(["/v1/candles", "AAPL", "1day"]).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
      expect((error as ApiError).message).toBe("チャートデータの取得に失敗しました");
    });
  });
});

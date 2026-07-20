import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCandles } from "@/hooks/useCandles";

// ---- モック設定 ----

const { mockUseSWR } = vi.hoisted(() => ({
  mockUseSWR: vi.fn(),
}));

vi.mock("swr", () => ({ default: mockUseSWR }));

vi.mock("@/lib/api", () => ({
  default: { GET: vi.fn() },
}));

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
});

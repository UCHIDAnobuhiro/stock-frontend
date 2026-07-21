import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSymbols } from "@/hooks/useSymbols";
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

describe("useSymbols", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("戻り値", () => {
    it("data があるとき symbols にそのまま返す", () => {
      const symbols = [
        { code: "AAPL", name: "Apple Inc." },
        { code: "GOOGL", name: "Alphabet Inc." },
      ];
      mockUseSWR.mockReturnValue({ data: symbols, isLoading: false, error: undefined });

      const { result } = renderHook(() => useSymbols());

      expect(result.current.symbols).toEqual(symbols);
    });

    it("data が undefined のとき symbols は空配列を返す", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      const { result } = renderHook(() => useSymbols());

      expect(result.current.symbols).toEqual([]);
    });

    it("isLoading が true のとき正しく伝播する", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

      const { result } = renderHook(() => useSymbols());

      expect(result.current.isLoading).toBe(true);
    });

    it("error があるとき正しく伝播する", () => {
      const error = new Error("銘柄一覧の取得に失敗しました");
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error });

      const { result } = renderHook(() => useSymbols());

      expect(result.current.error).toBe(error);
    });
  });

  describe("SWR の設定", () => {
    it("正しいキーとオプションで useSWR を呼ぶ", () => {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });

      renderHook(() => useSymbols());

      const [key, , options] = mockUseSWR.mock.calls[0];
      expect(key).toBe("/v1/symbols");
      expect(options.revalidateOnFocus).toBe(false);
    });
  });

  describe("fetchSymbols（フェッチャー）", () => {
    function getFetcher() {
      mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined });
      renderHook(() => useSymbols());
      const [, fetcher] = mockUseSWR.mock.calls[0];
      return fetcher as () => Promise<unknown>;
    }

    it("成功時は data をそのまま返す", async () => {
      const symbols = [{ code: "AAPL", name: "Apple Inc." }];
      mockGet.mockResolvedValue({ data: symbols, error: undefined, response: { status: 200 } });

      const result = await getFetcher()();

      expect(result).toEqual(symbols);
    });

    it("404 のとき「データが見つかりませんでした」を含む ApiError を throw する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 404 } });

      await expect(getFetcher()()).rejects.toThrow("データが見つかりませんでした");
    });

    it("500 のときサーバーエラーメッセージの ApiError を throw する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 500 } });

      await expect(getFetcher()()).rejects.toThrow(
        "サーバーエラーが発生しました。時間をおいて再度お試しください"
      );
    });

    it("マッピング外のステータスのときデフォルトメッセージの ApiError を throw する", async () => {
      mockGet.mockResolvedValue({ data: null, error: {}, response: { status: 400 } });

      const error = await getFetcher()().catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
      expect((error as ApiError).message).toBe("銘柄一覧の取得に失敗しました");
    });
  });
});

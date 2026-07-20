import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSymbols } from "@/hooks/useSymbols";

// ---- モック設定 ----

const { mockUseSWR } = vi.hoisted(() => ({
  mockUseSWR: vi.fn(),
}));

vi.mock("swr", () => ({ default: mockUseSWR }));

vi.mock("@/lib/api", () => ({
  default: { GET: vi.fn() },
}));

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
});

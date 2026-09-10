import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSymbols } from "@/hooks/useSymbols";
import type { SymbolItem } from "@/lib/market-data";
import { createSWRWrapper } from "@/tests/support/swr";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api")>(),
  default: { GET: mockGet },
}));

const symbols: SymbolItem[] = [{ code: "AAPL", name: "Apple", logo_url: null }];

describe("useSymbols と実際の SWR の連携", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([{ fallback: symbols }, { fallback: [] }])("SSR fallback を再検証中も保持する ($fallback)", async ({ fallback }) => {
    let resolveRequest!: (result: { data: SymbolItem[] }) => void;
    mockGet.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));
    const { result } = renderHook(() => useSymbols(), {
      wrapper: createSWRWrapper({ fallback: { "/v1/symbols": fallback } }),
    });

    expect(result.current.symbols).toEqual(fallback);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/v1/symbols"));
    expect(result.current.symbols).toEqual(fallback);
    expect(result.current.isLoading).toBe(true);

    await act(async () => resolveRequest({ data: symbols }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.symbols).toEqual(symbols);
  });

  it("同じ Provider 内の利用者はリクエストと取得結果を共有する", async () => {
    mockGet.mockResolvedValue({ data: symbols });
    const { result } = renderHook(() => [useSymbols(), useSymbols()], {
      wrapper: createSWRWrapper(),
    });

    await waitFor(() => expect(result.current[0].symbols).toEqual(symbols));
    expect(result.current[1].symbols).toEqual(symbols);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

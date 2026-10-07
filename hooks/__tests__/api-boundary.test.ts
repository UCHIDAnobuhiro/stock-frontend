import { act, renderHook, waitFor } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useCandles } from "@/hooks/useCandles";
import { useQuotes } from "@/hooks/useQuotes";
import { useSymbols } from "@/hooks/useSymbols";
import { fetchWatchlist, useWatchlist } from "@/hooks/useWatchlist";
import { useLogoDetect } from "@/hooks/useLogoDetect";
import { useLogoAnalyze } from "@/hooks/useLogoAnalyze";
import { createSWRWrapper } from "@/tests/support/swr";

const { mockFetch } = vi.hoisted(() => {
  const mockFetch = vi.fn<typeof fetch>();
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost");
  vi.stubGlobal("fetch", mockFetch);
  return { mockFetch };
});

const ITEMS = [
  { id: 1, symbol_code: "AAPL", sort_key: 0 },
  { id: 2, symbol_code: "MSFT", sort_key: 1 },
];

describe("実APIクライアントのHTTPエラー境界", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    { body: null, headers: { "Content-Length": "0" } },
    { body: "" },
    { body: "null" },
  ])("認証確認で空の503応答を成功扱いしない: %j", async ({ body, headers }) => {
    mockFetch.mockImplementation(async () => new Response(body, { status: 503, headers }));
    await expect(fetchWatchlist()).rejects.toMatchObject({ status: 503 });
  });

  it("refreshで失効を確認した後の空401応答も認証失敗として返す", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 401 }));
    await expect(fetchWatchlist()).rejects.toMatchObject({ status: 401 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("株価・銘柄一覧の空503応答をエラーとして保持する", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 503 }));
    const { result } = renderHook(() => ({
      candles: useCandles("AAPL", "1day"),
      quotes: useQuotes(["AAPL"]),
      symbols: useSymbols(),
    }), { wrapper: createSWRWrapper() });

    await waitFor(() => {
      expect(result.current.candles.error).toMatchObject({ status: 503 });
      expect(result.current.quotes.error).toMatchObject({ status: 503 });
      expect(result.current.symbols.error).toMatchObject({ status: 503 });
    });
    expect(result.current.symbols.hasData).toBe(false);
  });

  it.each(["addSymbol", "removeSymbol", "reorder"] as const)("%sの空503応答では楽観的更新を復元する", async (operation) => {
    mockFetch.mockImplementation(async (input) => (input as Request).method === "GET"
      ? Response.json(ITEMS)
      : new Response(null, { status: 503, headers: { "Content-Length": "0" } }));
    const { result } = renderHook(() => useWatchlist(), { wrapper: createSWRWrapper() });
    await waitFor(() => expect(result.current.items).toEqual(ITEMS));

    await act(async () => {
      const mutation = operation === "reorder"
        ? result.current.reorder(["MSFT", "AAPL"])
        : result.current[operation](operation === "addSymbol" ? "TSLA" : "AAPL");
      await expect(mutation).rejects.toMatchObject({ status: 503 });
    });
    expect(result.current.items).toEqual(ITEMS);
  });

  it("ロゴ検出・企業分析の空503応答を結果なしの成功扱いしない", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 503 }));
    const { result } = renderHook(() => ({
      logo: useLogoDetect(),
      company: useLogoAnalyze(),
    }), { wrapper: createSWRWrapper() });

    await act(async () => {
      await expect(result.current.logo.detect(new File(["image"], "logo.png", { type: "image/png" })))
        .rejects.toThrow("サービスが一時的に利用できません");
      await expect(result.current.company.analyze("Apple"))
        .rejects.toThrow("サービスが一時的に利用できません");
    });
    expect(result.current.logo.hasSearched).toBe(false);
  });
});

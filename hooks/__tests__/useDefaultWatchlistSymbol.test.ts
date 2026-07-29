import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDefaultWatchlistSymbol } from "@/hooks/useDefaultWatchlistSymbol";

const mockUseSelectedSymbol = vi.fn();
const mockUseWatchlist = vi.fn();
const mockReplaceSymbol = vi.fn();

vi.mock("@/hooks/useSelectedSymbol", () => ({
  useSelectedSymbol: () => mockUseSelectedSymbol(),
}));

vi.mock("@/hooks/useWatchlist", () => ({
  useWatchlist: () => mockUseWatchlist(),
}));

describe("useDefaultWatchlistSymbol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSelectedSymbol.mockReturnValue({
      symbol: null,
      replaceSymbol: mockReplaceSymbol,
    });
    mockUseWatchlist.mockReturnValue({
      items: [],
      isLoading: false,
      error: undefined,
    });
  });

  it("取得完了後、URL未指定ならwatchlist先頭をreplaceで選択する", async () => {
    mockUseWatchlist.mockReturnValue({
      items: [
        { id: 1, symbol_code: "AAPL", sort_key: 1 },
        { id: 2, symbol_code: "MSFT", sort_key: 2 },
      ],
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useDefaultWatchlistSymbol());

    await waitFor(() => expect(mockReplaceSymbol).toHaveBeenCalledWith("AAPL"));
    expect(result.current.isInitializing).toBe(true);
  });

  it("watchlist外でもURLに既存symbolがあれば上書きしない", () => {
    mockUseSelectedSymbol.mockReturnValue({
      symbol: "TSLA",
      replaceSymbol: mockReplaceSymbol,
    });
    mockUseWatchlist.mockReturnValue({
      items: [{ id: 1, symbol_code: "AAPL", sort_key: 1 }],
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useDefaultWatchlistSymbol());

    expect(mockReplaceSymbol).not.toHaveBeenCalled();
    expect(result.current.isInitializing).toBe(false);
  });

  it("watchlist取得中はreplaceせず初期化中を返す", () => {
    mockUseWatchlist.mockReturnValue({
      items: [],
      isLoading: true,
      error: undefined,
    });

    const { result } = renderHook(() => useDefaultWatchlistSymbol());

    expect(mockReplaceSymbol).not.toHaveBeenCalled();
    expect(result.current.isInitializing).toBe(true);
  });

  it("空のwatchlistでは未選択表示へ進む", () => {
    const { result } = renderHook(() => useDefaultWatchlistSymbol());

    expect(mockReplaceSymbol).not.toHaveBeenCalled();
    expect(result.current.isInitializing).toBe(false);
  });

  it("watchlist取得エラーでは未選択表示へ進む", () => {
    mockUseWatchlist.mockReturnValue({
      items: [],
      isLoading: false,
      error: new Error("failed"),
    });

    const { result } = renderHook(() => useDefaultWatchlistSymbol());

    expect(mockReplaceSymbol).not.toHaveBeenCalled();
    expect(result.current.isInitializing).toBe(false);
  });
});

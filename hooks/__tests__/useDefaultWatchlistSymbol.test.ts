import { renderHook, waitFor } from "@testing-library/react";
import { StrictMode, createElement, type ReactNode } from "react";
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

  it("Strict Modeでeffectが再実行されてもreplaceは一度だけ呼ぶ", async () => {
    mockUseWatchlist.mockReturnValue({
      items: [{ id: 1, symbol_code: "AAPL", sort_key: 1 }],
      isLoading: false,
      error: undefined,
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children);

    renderHook(() => useDefaultWatchlistSymbol(), { wrapper });

    await waitFor(() => expect(mockReplaceSymbol).toHaveBeenCalledTimes(1));
  });

  it("URL反映前に再レンダーやSWR再検証があってもreplaceは一度だけ呼ぶ", async () => {
    mockUseWatchlist.mockReturnValue({
      items: [{ id: 1, symbol_code: "AAPL", sort_key: 1 }],
      isLoading: false,
      error: undefined,
    });
    const { rerender } = renderHook(() => useDefaultWatchlistSymbol());

    await waitFor(() => expect(mockReplaceSymbol).toHaveBeenCalledTimes(1));

    mockUseWatchlist.mockReturnValue({
      items: [{ id: 2, symbol_code: "MSFT", sort_key: 1 }],
      isLoading: false,
      error: undefined,
    });
    rerender();

    expect(mockReplaceSymbol).toHaveBeenCalledTimes(1);
    expect(mockReplaceSymbol).toHaveBeenCalledWith("AAPL");
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

  it("空またはエラーの後にSWR再取得でデータが来たら初期選択する", async () => {
    const { rerender } = renderHook(() => useDefaultWatchlistSymbol());

    expect(mockReplaceSymbol).not.toHaveBeenCalled();

    mockUseWatchlist.mockReturnValue({
      items: [],
      isLoading: false,
      error: new Error("failed"),
    });
    rerender();
    expect(mockReplaceSymbol).not.toHaveBeenCalled();

    mockUseWatchlist.mockReturnValue({
      items: [{ id: 1, symbol_code: "AAPL", sort_key: 1 }],
      isLoading: false,
      error: undefined,
    });
    rerender();

    await waitFor(() => expect(mockReplaceSymbol).toHaveBeenCalledWith("AAPL"));
  });
});

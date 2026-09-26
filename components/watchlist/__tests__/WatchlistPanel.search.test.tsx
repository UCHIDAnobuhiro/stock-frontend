import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WatchlistPanel } from "@/components/watchlist/WatchlistPanel";

const { rowRender, setSymbol } = vi.hoisted(() => ({
  rowRender: vi.fn(),
  setSymbol: vi.fn(),
}));

vi.mock("@/hooks/useWatchlist", () => ({
  useWatchlist: () => ({
    items: [{ symbol_code: "AAPL" }],
    isLoading: false,
    removeSymbol: vi.fn(),
    reorder: vi.fn(),
  }),
}));
vi.mock("@/hooks/useSymbols", () => ({
  useSymbols: () => ({
    symbols: [{ code: "AAPL", name: "Apple Inc.", logo_url: null }],
    isLoading: false,
    hasData: true,
  }),
}));
vi.mock("@/hooks/useSelectedSymbol", () => ({
  useSelectedSymbol: () => ({ symbol: "AAPL", setSymbol }),
}));
vi.mock("@/hooks/useQuotes", () => ({
  useQuotes: () => ({ quotes: new Map(), failures: new Map(), isLoading: false }),
}));
vi.mock("@/components/watchlist/WatchlistItem", () => ({
  WatchlistItem: () => {
    rowRender();
    return <div>ウォッチリスト行</div>;
  },
}));

describe("WatchlistPanel の検索", () => {
  it("入力を繰り返してもウォッチリスト行を再描画しない", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    const user = userEvent.setup();
    render(<WatchlistPanel viewMode="compact" onToggleViewMode={() => {}} listScrollTopRef={{ current: 0 }} />);
    expect(screen.getByText("ウォッチリスト行")).toBeTruthy();
    const initialRenders = rowRender.mock.calls.length;

    await user.type(screen.getByPlaceholderText("銘柄コード・企業名で検索..."), "Apple");

    expect(rowRender).toHaveBeenCalledTimes(initialRenders);
    expect(screen.getByRole("option", { name: /AAPL/ })).toBeTruthy();
  });
});

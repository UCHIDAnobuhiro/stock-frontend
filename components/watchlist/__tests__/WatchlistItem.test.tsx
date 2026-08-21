import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WatchlistItem } from "@/components/watchlist/WatchlistItem";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

vi.mock("@/components/ui/SymbolLogo", () => ({
  SymbolLogo: ({ code }: { code: string }) => <span>{code} logo</span>,
}));

vi.mock("@/components/watchlist/WatchlistSparkline", () => ({
  WatchlistSparkline: () => <div data-testid="sparkline" />,
}));

const defaultProps = {
  id: "AAPL",
  code: "AAPL",
  name: "Apple Inc.",
  isActive: false,
  onClick: vi.fn(),
  onRemove: vi.fn(),
  viewMode: "compact" as const,
  isQuoteLoading: false,
};

describe("WatchlistItem", () => {
  it("株価取得に失敗した銘柄へ取得失敗を表示する", () => {
    render(
      <WatchlistItem
        {...defaultProps}
        quoteFailure={{ code: "AAPL", reason: "fetch_failed" }}
      />,
    );

    const failure = screen.getByText("取得失敗");
    expect(failure.getAttribute("title")).toBe(
      "株価サマリーを取得できませんでした",
    );
  });

  it("ローソク足が不足した銘柄へデータ不足を表示する", () => {
    render(
      <WatchlistItem
        {...defaultProps}
        quoteFailure={{ code: "AAPL", reason: "insufficient_data" }}
      />,
    );

    const failure = screen.getByText("データ不足");
    expect(failure.getAttribute("title")).toBe(
      "前日比の計算に必要なデータが不足しています",
    );
  });
});

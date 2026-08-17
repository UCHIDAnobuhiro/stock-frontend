import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompanyAnalysisCard } from "@/components/logo/CompanyAnalysisCard";
import type { CompanyAnalysisResponse } from "@/hooks/useLogoAnalyze";

const analysis: CompanyAnalysisResponse = {
  company_name: "Alphabet Inc.",
  ticker: "GOOGL",
  summary: "企業分析サマリー",
};

const defaultProps = {
  analysis,
  isLoading: false,
  symbolCode: "GOOGL",
  isResolvingSymbol: false,
  isInWatchlist: false,
  isWatchlistLoading: false,
  isAddingToWatchlist: false,
  onViewChart: vi.fn(),
  onAddToWatchlist: vi.fn(),
};

describe("CompanyAnalysisCard", () => {
  it("正式企業名・ticker・操作ボタンを要約より前に表示する", () => {
    render(<CompanyAnalysisCard {...defaultProps} />);

    expect(screen.getByText("Alphabet Inc.")).toBeTruthy();
    expect(screen.getByText("GOOGL")).toBeTruthy();
    expect(screen.getByRole("button", { name: "チャートを見る" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "ウォッチリストに追加" }),
    ).toBeTruthy();
  });

  it("チャート・ウォッチリスト操作を通知する", () => {
    const onViewChart = vi.fn();
    const onAddToWatchlist = vi.fn();
    render(
      <CompanyAnalysisCard
        {...defaultProps}
        onViewChart={onViewChart}
        onAddToWatchlist={onAddToWatchlist}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "チャートを見る" }));
    fireEvent.click(
      screen.getByRole("button", { name: "ウォッチリストに追加" }),
    );

    expect(onViewChart).toHaveBeenCalledOnce();
    expect(onAddToWatchlist).toHaveBeenCalledOnce();
  });

  it("追加済みの場合はウォッチリスト操作を無効化する", () => {
    render(<CompanyAnalysisCard {...defaultProps} isInWatchlist />);

    expect(
      (screen.getByRole("button", { name: "追加済み" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("tickerを特定できない場合は操作を表示しない", () => {
    render(
      <CompanyAnalysisCard
        {...defaultProps}
        analysis={{ ...analysis, ticker: null }}
        symbolCode={null}
      />,
    );

    expect(screen.queryByRole("button", { name: "チャートを見る" })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "ティッカーを特定できなかったため",
    );
  });

  it("tickerが銘柄一覧にない場合は理由を表示する", () => {
    render(<CompanyAnalysisCard {...defaultProps} symbolCode={null} />);

    expect(screen.getByRole("status").textContent).toContain(
      "「GOOGL」は現在利用できる銘柄にありません",
    );
  });
});

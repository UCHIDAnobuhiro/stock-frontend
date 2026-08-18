import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartContainer } from "@/components/chart/ChartContainer";

// ---- モック設定 ----

const mockUseSelectedSymbol = vi.fn();
const mockUseDefaultWatchlistSymbol = vi.fn();
const mockUseCandles = vi.fn();
const mockUseIndicators = vi.fn();
const mockUseNavigationLoading = vi.fn();

vi.mock("@/hooks/useSelectedSymbol", () => ({
  useSelectedSymbol: () => mockUseSelectedSymbol(),
}));

vi.mock("@/hooks/useDefaultWatchlistSymbol", () => ({
  useDefaultWatchlistSymbol: () => mockUseDefaultWatchlistSymbol(),
}));

vi.mock("@/hooks/useCandles", () => ({
  useCandles: () => mockUseCandles(),
}));

vi.mock("@/hooks/useIndicators", () => ({
  useIndicators: () => mockUseIndicators(),
}));

vi.mock("@/components/providers/NavigationLoadingProvider", () => ({
  useNavigationLoading: () => mockUseNavigationLoading(),
}));

// ChartContainer は相対パス（./CandlestickChart, ./ChartToolbar）で import しているが、
// 同一ファイルを指す絶対パスでモックすれば解決される
vi.mock("@/components/chart/CandlestickChart", () => ({
  CandlestickChart: () => <div data-testid="candlestick-chart" />,
}));

vi.mock("@/components/chart/ChartToolbar", () => ({
  ChartToolbar: () => <div data-testid="chart-toolbar" />,
}));

vi.mock("@/components/chart/ChartSkeleton", () => ({
  ChartSkeleton: () => <div data-testid="chart-skeleton" />,
}));

vi.mock("@/components/chart/ChartEmpty", () => ({
  ChartEmpty: ({ message }: { message?: string }) => (
    <div data-testid="chart-empty">{message ?? "銘柄を選択してください"}</div>
  ),
}));

// ---- テスト ----

describe("ChartContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIndicators.mockReturnValue({
      smaEnabled: false,
      toggleSma: vi.fn(),
      bollingerEnabled: false,
      toggleBollinger: vi.fn(),
    });
    mockUseDefaultWatchlistSymbol.mockReturnValue({ isInitializing: false });
    mockUseNavigationLoading.mockReturnValue({ isChartPending: false });
  });

  it("watchlist取得中は未選択表示ではなくSkeletonを表示する", () => {
    mockUseSelectedSymbol.mockReturnValue({ symbol: null, interval: "1day" });
    mockUseDefaultWatchlistSymbol.mockReturnValue({ isInitializing: true });
    mockUseCandles.mockReturnValue({ candles: [], isLoading: false, error: undefined });

    render(<ChartContainer />);

    expect(screen.getByTestId("chart-skeleton")).toBeTruthy();
    expect(screen.queryByTestId("chart-empty")).toBeNull();
  });

  it("watchlistが空または取得エラーで初期化が終了したら未選択表示にする", () => {
    mockUseSelectedSymbol.mockReturnValue({ symbol: null, interval: "1day" });
    mockUseCandles.mockReturnValue({ candles: [], isLoading: false, error: undefined });

    render(<ChartContainer />);

    expect(screen.getByTestId("chart-empty")).toBeTruthy();
    expect(screen.queryByTestId("chart-skeleton")).toBeNull();
  });

  it("symbol選択済みならisInitializingがtrueでもチャート表示を優先する", () => {
    mockUseSelectedSymbol.mockReturnValue({ symbol: "AAPL", interval: "1day" });
    mockUseDefaultWatchlistSymbol.mockReturnValue({ isInitializing: true });
    mockUseCandles.mockReturnValue({
      candles: [{ time: "2024-01-01", open: 100, high: 110, low: 90, close: 105, volume: 1000 }],
      isLoading: false,
      error: undefined,
    });

    render(<ChartContainer />);

    expect(screen.getByTestId("candlestick-chart")).toBeTruthy();
    expect(screen.queryByTestId("chart-skeleton")).toBeNull();
  });

  it("symbol選択済み・ローディング/エラーなし・candles が空のとき「データがありません」を表示し、CandlestickChart は描画しない（Issue #41 の回帰防止）", () => {
    mockUseSelectedSymbol.mockReturnValue({ symbol: "AAPL", interval: "1day" });
    mockUseCandles.mockReturnValue({ candles: [], isLoading: false, error: undefined });

    render(<ChartContainer />);

    expect(screen.getByText("データがありません")).toBeTruthy();
    expect(screen.queryByTestId("candlestick-chart")).toBeNull();
  });

  it("candles にデータがあるとき CandlestickChart を描画する", () => {
    mockUseSelectedSymbol.mockReturnValue({ symbol: "AAPL", interval: "1day" });
    mockUseCandles.mockReturnValue({
      candles: [{ time: "2024-01-01", open: 100, high: 110, low: 90, close: 105, volume: 1000 }],
      isLoading: false,
      error: undefined,
    });

    render(<ChartContainer />);

    expect(screen.getByTestId("candlestick-chart")).toBeTruthy();
    expect(screen.queryByText("データがありません")).toBeNull();
  });

  it("チャートのURL遷移中は読み込みオーバーレイを表示する", () => {
    mockUseSelectedSymbol.mockReturnValue({ symbol: "AAPL", interval: "1day" });
    mockUseCandles.mockReturnValue({
      candles: [{ time: "2024-01-01", open: 100, high: 110, low: 90, close: 105, volume: 1000 }],
      isLoading: false,
      error: undefined,
    });
    mockUseNavigationLoading.mockReturnValue({ isChartPending: true });

    render(<ChartContainer />);

    expect(screen.getByRole("status").textContent).toContain(
      "チャートを読み込んでいます...",
    );
  });
});

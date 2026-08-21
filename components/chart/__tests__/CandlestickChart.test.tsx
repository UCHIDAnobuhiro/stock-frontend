import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, screen } from "@testing-library/react";
import { CandlestickChart } from "@/components/chart/CandlestickChart";
import type { CandleResponse } from "@/hooks/useCandles";

// ---- モック設定 ----

const { mockSeriesInstances, mockChart, mockTimeScale, createChartMock } = vi.hoisted(() => {
  const mockSeriesInstances: Array<{
    setData: ReturnType<typeof vi.fn>;
    applyOptions: ReturnType<typeof vi.fn>;
  }> = [];

  const mockTimeScale = {
    setVisibleLogicalRange: vi.fn(),
    getVisibleLogicalRange: vi.fn(),
    subscribeVisibleLogicalRangeChange: vi.fn(),
    unsubscribeVisibleLogicalRangeChange: vi.fn(),
  };

  const mockChart = {
    addSeries: vi.fn(() => {
      const series = { setData: vi.fn(), applyOptions: vi.fn() };
      mockSeriesInstances.push(series);
      return series;
    }),
    removeSeries: vi.fn(),
    priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
    timeScale: vi.fn(() => mockTimeScale),
    subscribeCrosshairMove: vi.fn(),
    unsubscribeCrosshairMove: vi.fn(),
    subscribeClick: vi.fn(),
    unsubscribeClick: vi.fn(),
    applyOptions: vi.fn(),
    remove: vi.fn(),
  };

  const createChartMock = vi.fn(() => mockChart);

  return { mockSeriesInstances, mockChart, mockTimeScale, createChartMock };
});

vi.mock("lightweight-charts", () => ({
  createChart: createChartMock,
  CandlestickSeries: {},
  CrosshairMode: { Magnet: 1, Hidden: 2 },
  HistogramSeries: {},
  LineSeries: {},
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

let resizeObserverCallback: ResizeObserverCallback | undefined;
let mockClientWidth = 375;

// jsdom に ResizeObserver が無いため、コールバックをテストから発火できるスタブを用意する
class ResizeObserverStub {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// ---- テストデータ ----

const candlesWithData: CandleResponse[] = [
  { time: "2024-01-01", open: 100, high: 110, low: 90, close: 105, volume: 1000 },
  { time: "2024-01-02", open: 105, high: 115, low: 95, close: 110, volume: 1200 },
];

const candlesForRangeTest: CandleResponse[] = Array.from({ length: 100 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 0, index + 1)).toISOString().slice(0, 10);
  return { time: date, open: 100 + index, high: 110 + index, low: 90 + index, close: 105 + index, volume: 1000 };
});

// ---- テスト ----

describe("CandlestickChart", () => {
  beforeEach(() => {
    mockSeriesInstances.length = 0;
    mockClientWidth = 375;
    resizeObserverCallback = undefined;
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => mockClientWidth,
    });
    // @ts-expect-error jsdom に ResizeObserver が存在しないためグローバルへ追加する
    global.ResizeObserver = ResizeObserverStub;
  });

  it("データが空になったら candle/volume 両シリーズの setData が空配列で呼ばれる（Issue #41 の回帰防止）", async () => {
    const { rerender } = render(
      <CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />
    );

    // チャート生成 effect 内の queueMicrotask(() => setChartReady(true)) を反映させる
    await act(async () => {});

    // addSeries は 1 回目がローソク足、2 回目が出来高
    expect(mockSeriesInstances).toHaveLength(2);
    const [candleSeries, volumeSeries] = mockSeriesInstances;

    // データありでレンダリングした直後は、それぞれのシリーズにデータが設定される
    expect(candleSeries.setData).toHaveBeenCalledTimes(1);
    expect(candleSeries.setData.mock.calls[0][0]).toHaveLength(candlesWithData.length);
    expect(volumeSeries.setData).toHaveBeenCalledTimes(1);
    expect(volumeSeries.setData.mock.calls[0][0]).toHaveLength(candlesWithData.length);

    // データが空の配列に切り替わって rerender
    rerender(<CandlestickChart candles={[]} interval="1day" smaEnabled={false} bollingerEnabled={false} />);

    await act(async () => {});

    // 空配列で setData が呼ばれ、前回のローソク足・出来高がクリアされること
    expect(candleSeries.setData).toHaveBeenCalledTimes(2);
    expect(candleSeries.setData).toHaveBeenLastCalledWith([]);
    expect(volumeSeries.setData).toHaveBeenCalledTimes(2);
    expect(volumeSeries.setData).toHaveBeenLastCalledWith([]);
  });

  it("初期状態では最新ローソク足の4本値を固定表示する", async () => {
    render(
      <CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />
    );

    await act(async () => {});

    const candleInfo = screen.getByTestId("candle-info");
    expect(candleInfo.textContent).toContain("2024/01/02");
    expect(candleInfo.textContent).toContain("始値105.00");
    expect(candleInfo.textContent).toContain("高値115.00");
    expect(candleInfo.textContent).toContain("安値95.00");
    expect(candleInfo.textContent).toContain("終値110.00");
    expect(candleInfo.textContent).toContain("出来高 1,200");
  });

  it("スマホではローソク足をタップしても最新足の4本値を表示する", async () => {
    render(
      <CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />
    );

    await act(async () => {});
    const [candleSeries, volumeSeries] = mockSeriesInstances;
    const clickHandler = mockChart.subscribeClick.mock.calls[0][0];

    act(() => {
      clickHandler({
        time: "2024-01-01",
        seriesData: new Map([
          [candleSeries, { open: 100, high: 110, low: 90, close: 105 }],
          [volumeSeries, { value: 1000 }],
        ]),
      });
    });

    const candleInfo = screen.getByTestId("candle-info");
    expect(candleInfo.textContent).toContain("2024/01/02");
    expect(candleInfo.textContent).toContain("始値105.00");
    expect(candleInfo.textContent).toContain("終値110.00");
  });

  it("PCではローソク足を選択するとその足の4本値を表示する", async () => {
    mockClientWidth = 800;
    render(
      <CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />
    );

    await act(async () => {});
    const [candleSeries, volumeSeries] = mockSeriesInstances;
    const clickHandler = mockChart.subscribeClick.mock.calls[0][0];

    act(() => {
      clickHandler({
        time: "2024-01-01",
        seriesData: new Map([
          [candleSeries, { open: 100, high: 110, low: 90, close: 105 }],
          [volumeSeries, { value: 1000 }],
        ]),
      });
    });

    const candleInfo = screen.getByTestId("candle-info");
    expect(candleInfo.textContent).toContain("2024/01/01");
    expect(candleInfo.textContent).toContain("始値100.00");
    expect(candleInfo.textContent).toContain("終値105.00");
  });

  it("表示範囲を変更してもリセットボタンを表示しない", async () => {
    render(
      <CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />
    );

    await act(async () => {});
    expect(screen.queryByRole("button", { name: "表示範囲を初期状態に戻す" })).toBeNull();

    const rangeChangeHandler = mockTimeScale.subscribeVisibleLogicalRangeChange.mock.calls[0][0];
    act(() => rangeChangeHandler({ from: -5, to: 1 }));

    expect(screen.queryByRole("button", { name: "表示範囲を初期状態に戻す" })).toBeNull();
  });

  it("スマホ幅では横スクロールだけを有効にし、クロスヘアを非表示にする", async () => {
    render(
      <CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />
    );

    await act(async () => {});

    expect(createChartMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        crosshair: expect.objectContaining({ mode: 2 }),
        handleScale: expect.objectContaining({
          axisPressedMouseMove: false,
          axisDoubleClickReset: false,
          mouseWheel: false,
          pinch: false,
        }),
        handleScroll: expect.objectContaining({ horzTouchDrag: true, vertTouchDrag: false }),
      }),
    );
  });

  it("PCで足を選択した後にスマホ幅へ変わると最新足の4本値へ戻す", async () => {
    mockClientWidth = 800;
    render(
      <CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />
    );

    await act(async () => {});
    const [candleSeries, volumeSeries] = mockSeriesInstances;
    const clickHandler = mockChart.subscribeClick.mock.calls[0][0];
    act(() => {
      clickHandler({
        time: "2024-01-01",
        seriesData: new Map([
          [candleSeries, { open: 100, high: 110, low: 90, close: 105 }],
          [volumeSeries, { value: 1000 }],
        ]),
      });
    });
    expect(screen.getByTestId("candle-info").textContent).toContain("2024/01/01");

    mockClientWidth = 390;
    act(() => resizeObserverCallback?.([], {} as ResizeObserver));

    expect(screen.getByTestId("candle-info").textContent).toContain("2024/01/02");
    expect(mockChart.applyOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ crosshair: { mode: 2 } }),
    );
  });

  it("未操作のままPC幅からスマホ幅へ変わったら初期表示を60本から30本へ更新する", async () => {
    mockClientWidth = 800;
    render(
      <CandlestickChart candles={candlesForRangeTest} interval="1day" smaEnabled={false} bollingerEnabled={false} />
    );

    await act(async () => {});
    expect(mockTimeScale.setVisibleLogicalRange).toHaveBeenLastCalledWith({ from: 40, to: 99 });

    mockClientWidth = 390;
    act(() => resizeObserverCallback?.([], {} as ResizeObserver));

    expect(mockTimeScale.setVisibleLogicalRange).toHaveBeenLastCalledWith({ from: 70, to: 99 });
  });

  it("操作済みでスマホ幅へ変わったら現在範囲を維持する", async () => {
    mockClientWidth = 800;
    render(
      <CandlestickChart candles={candlesForRangeTest} interval="1day" smaEnabled={false} bollingerEnabled={false} />
    );

    await act(async () => {});
    const rangeChangeHandler = mockTimeScale.subscribeVisibleLogicalRangeChange.mock.calls[0][0];
    act(() => rangeChangeHandler({ from: 75, to: 99 }));
    mockTimeScale.getVisibleLogicalRange.mockReturnValue({ from: 75, to: 99 });

    mockClientWidth = 390;
    act(() => resizeObserverCallback?.([], {} as ResizeObserver));

    expect(mockTimeScale.setVisibleLogicalRange).toHaveBeenCalledTimes(1);
  });
});

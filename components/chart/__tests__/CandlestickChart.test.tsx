import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, screen, fireEvent } from "@testing-library/react";
import { CandlestickChart } from "@/components/chart/CandlestickChart";
import type { AutoscaleInfoProvider } from "lightweight-charts";
import type { CandleResponse } from "@/hooks/useCandles";

// ---- モック設定 ----

const { mockSeriesInstances, mockChart, mockTimeScale, createChartMock, theme } = vi.hoisted(() => {
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
    setCrosshairPosition: vi.fn(),
    clearCrosshairPosition: vi.fn(),
  };

  const createChartMock = vi.fn(() => mockChart);

  return { mockSeriesInstances, mockChart, mockTimeScale, createChartMock, theme: { resolvedTheme: "light" } };
});

vi.mock("lightweight-charts", () => ({
  createChart: createChartMock,
  CandlestickSeries: {},
  CrosshairMode: { Magnet: 1, Hidden: 2 },
  HistogramSeries: {},
  LineSeries: {},
}));

vi.mock("next-themes", () => ({
  useTheme: () => theme,
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
    theme.resolvedTheme = "light";
    mockSeriesInstances.length = 0;
    mockClientWidth = 375;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
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

  it("長い出来高を省略せず、日付・4本値とともに表示する", async () => {
    render(
      <CandlestickChart
        candles={[{ ...candlesWithData[0], volume: 28014700 }]}
        interval="1month"
        smaEnabled={false}
        bollingerEnabled={false}
      />
    );
    await act(async () => {});

    expect(screen.getByText("出来高 28,014,700").textContent).toBe("出来高 28,014,700");
    const info = screen.getByTestId("candle-info");
    expect(info.textContent).toContain("2024/01/01");
    for (const label of ["始値", "高値", "安値", "終値"]) {
      expect(info.textContent).toContain(label);
    }
  });

  it("スマホは始値・高値・安値・出来高を最新足で表示し、終値と指標は表示しない", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const { rerender } = render(<CandlestickChart candles={candlesForRangeTest} interval="1day" smaEnabled bollingerEnabled />);
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "指標値を表示" })).toBeNull();
    expect(mockSeriesInstances).toHaveLength(2);
    expect(screen.queryByText(/SMA\(5\)/)).toBeNull();
    const oldEvent = { time: candlesForRangeTest[50].time, seriesData: new Map([[mockSeriesInstances[0], candlesForRangeTest[50]]]) };
    act(() => {
      mockChart.subscribeClick.mock.calls[0][0](oldEvent);
      mockChart.subscribeCrosshairMove.mock.calls[0][0](oldEvent);
    });
    expect(screen.getByTestId("candle-info").textContent).toContain("最新の足");
    expect(screen.getByTestId("candle-info").textContent).toContain("始値199.00");
    expect(screen.getByTestId("candle-info").textContent).toContain("出来高1,000");
    expect(screen.queryByText("終値")).toBeNull();
    for (const name of ["前の足を表示", "次の足を表示", "最新の足と表示範囲に戻す"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    const updated = candlesForRangeTest.map((c, i) => i === 99 ? { ...c, volume: 28014700 } : c);
    rerender(<CandlestickChart candles={updated} interval="1day" smaEnabled bollingerEnabled />);
    expect(screen.getByTestId("candle-info").textContent).toContain("出来高28,014,700");
    rerender(<CandlestickChart candles={updated} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    expect(screen.queryByText(/SMA\(5\)/)).toBeNull();
    expect(screen.queryByText(/BB\(20\)/)).toBeNull();
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

  it("表示範囲を変更すると最新へ戻る操作が有効になり、初期範囲に戻せる", async () => {
    render(<CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    await act(async () => {});
    const button = screen.getByRole("button", { name: "最新の足と表示範囲に戻す" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    act(() => mockTimeScale.subscribeVisibleLogicalRangeChange.mock.calls[0][0]({ from: -5, to: 1 }));
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(mockTimeScale.setVisibleLogicalRange).toHaveBeenLastCalledWith({ from: 0, to: 1 });
    expect(button.disabled).toBe(true);
  });

  it("スマホでは横スクロールとピンチズーム、クロスヘアを有効にする", async () => {
    render(
      <CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />
    );

    await act(async () => {});

    expect(createChartMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        crosshair: expect.objectContaining({ mode: 1 }),
        handleScale: expect.objectContaining({
          axisPressedMouseMove: false,
          axisDoubleClickReset: false,
          mouseWheel: false,
          pinch: true,
        }),
        handleScroll: expect.objectContaining({ horzTouchDrag: true, vertTouchDrag: false }),
      }),
    );
  });

  it("スマホの価格範囲は初回で固定し、スクロール・再取得・テーマ変更でも維持する", async () => {
    const { rerender } = render(<CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    await act(async () => {});
    const options = (mockChart.addSeries.mock.calls[0] as unknown as [unknown, { autoscaleInfoProvider: AutoscaleInfoProvider }])[1];
    const original = vi.fn().mockReturnValue(null);
    expect(options.autoscaleInfoProvider(original)).toBeNull();
    const initial = { priceRange: { minValue: 90, maxValue: 115 } };
    original.mockReturnValue(initial);
    expect(options.autoscaleInfoProvider(original)).toEqual(initial);
    original.mockReturnValue({ priceRange: { minValue: 100, maxValue: 105 } });
    act(() => mockTimeScale.subscribeVisibleLogicalRangeChange.mock.calls[0][0]({ from: -5, to: 1 }));
    expect(options.autoscaleInfoProvider(original)).toEqual(initial);
    theme.resolvedTheme = "dark";
    rerender(<CandlestickChart candles={[...candlesWithData]} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    expect(options.autoscaleInfoProvider(original)).toEqual(initial);

    // Desktop resumes automatic scaling; re-entering mobile captures a fresh range.
    mockClientWidth = 800;
    act(() => resizeObserverCallback?.([], {} as ResizeObserver));
    expect(options.autoscaleInfoProvider(original)).toEqual({ priceRange: { minValue: 100, maxValue: 105 } });
    mockClientWidth = 390;
    act(() => resizeObserverCallback?.([], {} as ResizeObserver));
    expect(options.autoscaleInfoProvider(original)).toEqual({ priceRange: { minValue: 100, maxValue: 105 } });
    original.mockReturnValue(initial);
    expect(options.autoscaleInfoProvider(original)).toEqual({ priceRange: { minValue: 100, maxValue: 105 } });

    rerender(<CandlestickChart candles={[]} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    expect(options.autoscaleInfoProvider(original)).toEqual(initial);
  });

  it("画面幅が変わっても選択した足の4本値を維持する", async () => {
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

    expect(screen.getByTestId("candle-info").textContent).toContain("2024/01/01");
    expect(mockChart.applyOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ crosshair: { mode: 1 } }),
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
  it("ホバーを離れても選択を維持し、クリックで固定・再クリックで追従に戻る", async () => {
    render(<CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    await act(async () => {});
    const event = { time: "2024-01-01", seriesData: new Map([[mockSeriesInstances[0], candlesWithData[0]]]) };
    const move = mockChart.subscribeCrosshairMove.mock.calls[0][0];
    const click = mockChart.subscribeClick.mock.calls[0][0];
    act(() => move(event));
    expect(screen.getByTestId("candle-info").textContent).toContain("選択中2024/01/01");
    act(() => move({ seriesData: new Map() }));
    expect(screen.getByTestId("candle-info").textContent).toContain("選択中2024/01/01");
    act(() => click(event));
    act(() => move({ time: "2024-01-02", seriesData: new Map([[mockSeriesInstances[0], candlesWithData[1]]]) }));
    expect(screen.getByTestId("candle-info").textContent).toContain("固定中2024/01/01");
    act(() => click(event));
    act(() => move({ time: "2024-01-02", seriesData: new Map([[mockSeriesInstances[0], candlesWithData[1]]]) }));
    expect(screen.getByTestId("candle-info").textContent).toContain("選択中2024/01/02");
  });

  it("前後ボタンで足を正確に選択でき、同日データの更新も反映する", async () => {
    const { rerender } = render(<CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "前の足を表示" }));
    expect(screen.getByTestId("candle-info").textContent).toContain("選択中2024/01/01");
    expect((screen.getByRole("button", { name: "前の足を表示" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<CandlestickChart candles={[{ ...candlesWithData[0], close: 106 }, candlesWithData[1]]} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    expect(screen.getByTestId("candle-info").textContent).toContain("終値106.00");
    fireEvent.click(screen.getByRole("button", { name: "次の足を表示" }));
    expect(screen.getByTestId("candle-info").textContent).toContain("2024/01/02");
  });

  it("テーマ変更でも操作済みの表示範囲と選択した足を維持する", async () => {
    const { rerender } = render(<CandlestickChart candles={candlesForRangeTest} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "前の足を表示" }));
    const range = { from: 20, to: 49 };
    act(() => mockTimeScale.subscribeVisibleLogicalRangeChange.mock.calls[0][0](range));
    mockTimeScale.getVisibleLogicalRange.mockReturnValue(range);
    theme.resolvedTheme = "dark";
    rerender(<CandlestickChart candles={candlesForRangeTest} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    expect(mockTimeScale.setVisibleLogicalRange).toHaveBeenLastCalledWith(range);
    expect(screen.getByTestId("candle-info").textContent).toContain("選択中");
  });

  it("指標値は初回から最新足に対応し、古い足で計算不能なら以前の値を残さない", async () => {
    const { rerender } = render(<CandlestickChart candles={candlesForRangeTest} interval="1day" smaEnabled bollingerEnabled />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "指標値を表示" }));
    // close=105..204、直近5本の平均=202。ホバー不要で表示される。
    expect(screen.getByText(/SMA\(5\)/).textContent).toContain("202.00");
    act(() => mockChart.subscribeClick.mock.calls[0][0]({ time: candlesForRangeTest[0].time, seriesData: new Map([[mockSeriesInstances[0], candlesForRangeTest[0]]]) }));
    expect(screen.getByText(/SMA\(5\)/).textContent).toContain("—");
    expect(screen.getByText(/BB\(20\)/).textContent).toContain("—");
    rerender(<CandlestickChart candles={candlesForRangeTest} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    expect(screen.queryByText(/SMA\(5\)/)).toBeNull();
    expect(screen.queryByText(/BB\(20\)/)).toBeNull();
  });

  it("四本値の配置先を変えても表示は一つで、チャートを作り直さない", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const { rerender, unmount } = render(<CandlestickChart candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    await act(async () => {});
    const createCount = createChartMock.mock.calls.length;
    rerender(<CandlestickChart readoutContainer={target} candles={candlesWithData} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    expect(screen.getAllByTestId("candle-info")).toHaveLength(1);
    expect(target.contains(screen.getByTestId("candle-info"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "前の足を表示" }));
    expect(target.textContent).toContain("選択中2024/01/01");
    expect(createChartMock).toHaveBeenCalledTimes(createCount);
    unmount();
    expect(target.textContent).toBe("");
    target.remove();
  });

  it("指標値はヘッダー内に展開せずポップオーバーで表示する", async () => {
    const { rerender } = render(<CandlestickChart candles={candlesForRangeTest} interval="1day" smaEnabled={false} bollingerEnabled={false} />);
    await act(async () => {});
    const trigger = screen.getByRole("button", { name: "指標値を表示" }) as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    rerender(<CandlestickChart candles={candlesForRangeTest} interval="1day" smaEnabled bollingerEnabled />);
    const activeTrigger = screen.getByRole("button", { name: "指標値を表示" }) as HTMLButtonElement;
    expect(activeTrigger.disabled).toBe(false);
    expect(screen.queryByText(/SMA\(5\)/)).toBeNull();
    fireEvent.click(activeTrigger);
    expect(screen.getByText(/SMA\(5\)/)).toBeTruthy();
    expect(screen.getByTestId("candle-info").contains(screen.getByText(/SMA\(5\)/))).toBe(false);
    expect(activeTrigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("指標値を開いたままチャートを操作でき、四本値・SMA・BBが同じ足に追従する", async () => {
    render(<CandlestickChart candles={candlesForRangeTest} interval="1day" smaEnabled bollingerEnabled />);
    await act(async () => {});
    const trigger = screen.getByRole("button", { name: "指標値を表示" });
    fireEvent.click(trigger);
    const chart = screen.getByLabelText(/ローソク足チャート。/);
    const eventAt = (index: number) => ({ time: candlesForRangeTest[index].time, seriesData: new Map([[mockSeriesInstances[0], candlesForRangeTest[index]]]) });
    act(() => mockChart.subscribeCrosshairMove.mock.calls[0][0](eventAt(50)));
    expect(screen.getByTestId("candle-info").textContent).toContain("終値155.00");
    expect(screen.getByText(/SMA\(5\)/).textContent).toContain("153.00");
    expect(screen.getByText(/BB\(20\)/).textContent).toContain("145.50");
    fireEvent.pointerDown(chart);
    fireEvent.mouseDown(chart);
    fireEvent.click(chart);
    act(() => mockChart.subscribeClick.mock.calls[0][0](eventAt(51)));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/SMA\(5\)/).textContent).toContain("154.00");
    act(() => mockChart.subscribeCrosshairMove.mock.calls[0][0](eventAt(52)));
    expect(screen.getByTestId("candle-info").textContent).toContain("固定中");
    expect(screen.getByTestId("candle-info").textContent).toContain("終値156.00");
    expect(screen.getByText(/SMA\(5\)/).textContent).toContain("154.00");
    expect(screen.getByText(/BB\(20\)/).textContent).toContain("146.50");
    act(() => mockChart.subscribeClick.mock.calls[0][0](eventAt(51)));
    act(() => mockChart.subscribeCrosshairMove.mock.calls[0][0](eventAt(52)));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("candle-info").textContent).toContain("終値157.00");
    expect(screen.getByText(/SMA\(5\)/).textContent).toContain("155.00");
    expect(screen.getByText(/BB\(20\)/).textContent).toContain("147.50");
    fireEvent.click(screen.getByRole("button", { name: "指標値を閉じる" }));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("逆順データでも描画と指標値が一致し、選択・テーマ変更で指標を再描画しない", async () => {
    const candles = [...candlesForRangeTest].reverse();
    const { rerender } = render(
      <CandlestickChart candles={candles} interval="1day" smaEnabled bollingerEnabled />,
    );
    await act(async () => {});
    const candleSeries = mockSeriesInstances[0];
    const lineSeries = mockSeriesInstances.slice(2);
    expect(lineSeries).toHaveLength(10);
    const smaSeries = lineSeries[0];
    const bandSeries = lineSeries[3];
    expect(candleSeries.setData.mock.lastCall?.[0][0].time).toBe("2024-01-01");
    expect(smaSeries.setData.mock.lastCall?.[0].at(-1).value).toBe(202);
    expect(bandSeries.setData.mock.lastCall?.[0].at(-1).value).toBe(194.5);

    fireEvent.click(screen.getByRole("button", { name: "指標値を表示" }));
    fireEvent.click(screen.getByRole("button", { name: "前の足を表示" }));
    expect(screen.getByText(/SMA\(5\)/).textContent).toContain("201.00");
    expect(screen.getByText(/BB\(20\)/).textContent).toContain("193.50");
    theme.resolvedTheme = "dark";
    rerender(<CandlestickChart candles={candles} interval="1day" smaEnabled bollingerEnabled />);
    expect(mockSeriesInstances.slice(2)).toEqual(lineSeries);
    for (const series of lineSeries) expect(series.setData).toHaveBeenCalledTimes(1);
    // 入力配列は SWR のキャッシュと共有されるため、ソートで変更してはいけない。
    expect(candles[0]).toEqual(candlesForRangeTest.at(-1));
  });

});

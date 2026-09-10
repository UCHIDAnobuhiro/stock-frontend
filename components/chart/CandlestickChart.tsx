"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTheme } from "next-themes";
import { IndicatorReadout } from "./IndicatorReadout";
import {
  createChart,
  CandlestickSeries,
  CrosshairMode,
  HistogramSeries,
  type AutoscaleInfo,
  type IChartApi,
  type LogicalRange,
  type MouseEventParams,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { CandleResponse, Interval } from "@/lib/market-data";
import { SMA_PERIODS, calcSMA, calcBollingerBands } from "@/lib/indicators";
import { useIndicatorSeries } from "./useIndicatorSeries";
import { useBollingerSeries } from "./useBollingerSeries";

const darkColors = {
  background: "#1c1d21",
  textColor: "#a5a6b0",
  grid: "#2b2c32",
  crosshair: "#a5a6b0",
  border: "#37383f",
  upColor: "#6cd19b",
  downColor: "#ff7e87",
  volumeBull: "#214d38",
  volumeBear: "#612d35",
};

const lightColors = {
  background: "#ffffff",
  textColor: "#62636b",
  grid: "#ededf1",
  crosshair: "#9598a1",
  border: "#e0e3eb",
  upColor: "#1a7f37",
  downColor: "#cf222e",
  volumeBull: "#5cbcb3",
  volumeBear: "#f78c95",
};

const MOBILE_BREAKPOINT = 640;
const isMobileViewport = () => window.innerWidth < MOBILE_BREAKPOINT;

const VISIBLE_CANDLES_MOBILE = 30;
const VISIBLE_CANDLES_DESKTOP = 60;

interface CandlestickChartProps {
  mobileIntervals?: ReactNode;
  readoutContainer?: HTMLElement | null;
  candles: CandleResponse[];
  interval: Interval;
  smaEnabled: boolean;
  bollingerEnabled: boolean;
}

interface VisibleLogicalRange {
  from: number;
  to: number;
}

function chartTimeToString(time: Time): string {
  if (typeof time === "string") return time;
  if (typeof time === "number") return new Date(time * 1000).toISOString().slice(0, 10);
  return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
}

function isSameRange(range: VisibleLogicalRange, defaultRange: VisibleLogicalRange): boolean {
  return Math.abs(range.from - defaultRange.from) < 0.5
    && Math.abs(range.to - defaultRange.to) < 0.5;
}

function getDefaultRange(total: number, width: number): VisibleLogicalRange {
  const visibleCount = width < MOBILE_BREAKPOINT
    ? VISIBLE_CANDLES_MOBILE
    : VISIBLE_CANDLES_DESKTOP;
  return {
    from: Math.max(0, total - visibleCount),
    to: total - 1,
  };
}

export function CandlestickChart({ mobileIntervals, readoutContainer, candles, interval, smaEnabled, bollingerEnabled }: CandlestickChartProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const defaultRangeRef = useRef<VisibleLogicalRange | null>(null);
  const dataLengthRef = useRef(0);
  const mobileAutoscaleRef = useRef<AutoscaleInfo | null>(null);
  const isRangeModifiedRef = useRef(false);
  const [isRangeModified, setIsRangeModified] = useState(false);
  const pinnedRef = useRef(false);
  const [isPinned, setIsPinned] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  // resolvedTheme は SSR/ハイドレーション前は undefined になる。
  // ThemeProvider は CandlestickChart より先にマウントされるため、
  // useEffect 実行時点では ref 経由で正しいテーマを取得できる。
  const resolvedThemeRef = useRef(resolvedTheme);
  useEffect(() => {
    resolvedThemeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  // チャート生成完了フラグ（useIndicatorSeries の effect をチャート生成後に走らせるため）
  const [chartReady, setChartReady] = useState(false);

  const sortedCandles = useMemo(() => [...candles].sort((a, b) => a.time.localeCompare(b.time)), [candles]);
  const latestCandle = sortedCandles.at(-1);
  const selectedCandle = isMobile ? undefined : sortedCandles.find(candle => candle.time === selectedTime);
  const selectedCandleExists = selectedCandle !== undefined;
  const displayedCandle = selectedCandle ?? latestCandle ?? null;

  // ソートと指標計算はデータ変更時だけ行い、描画と数値表示で共有する。
  const closeData = useMemo(
    () => sortedCandles.map(candle => ({ time: candle.time, value: candle.close })),
    [sortedCandles],
  );
  const smaData = useMemo(
    () => smaEnabled && !isMobile && closeData.length > 0
      ? SMA_PERIODS[interval].map(period => ({ period, values: calcSMA(closeData, period) }))
      : [],
    [closeData, interval, smaEnabled, isMobile],
  );
  const bollingerData = useMemo(
    () => bollingerEnabled && !isMobile ? calcBollingerBands(closeData) : [],
    [closeData, bollingerEnabled, isMobile],
  );
  useIndicatorSeries(chartRef, smaData, chartReady);
  useBollingerSeries(chartRef, bollingerData, chartReady);

  const selectedIndex = displayedCandle ? sortedCandles.findIndex(c => c.time === displayedCandle.time) : -1;
  const band = bollingerData.find(b => b.time === displayedCandle?.time);
  const formatPrice = (value: number) => value.toLocaleString("ja-JP", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const selectAdjacent = (offset: number) => {
    const candle = sortedCandles[selectedIndex + offset];
    if (!candle) return;
    setSelectedTime(candle.time);
    if (candleSeriesRef.current) chartRef.current?.setCrosshairPosition(candle.close, candle.time, candleSeriesRef.current);
  };
  const returnToLatest = () => {
    pinnedRef.current = false;
    setIsPinned(false);
    setSelectedTime(null);
    chartRef.current?.clearCrosshairPosition();
    if (defaultRangeRef.current) chartRef.current?.timeScale().setVisibleLogicalRange(defaultRangeRef.current);
    chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
    isRangeModifiedRef.current = false;
    setIsRangeModified(false);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const c = resolvedThemeRef.current === "light" ? lightColors : darkColors;

    let isMobile = containerRef.current.clientWidth < MOBILE_BREAKPOINT;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: c.background },
        textColor: c.textColor,
      },
      grid: {
        vertLines: { color: c.grid },
        horzLines: { color: c.grid },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: c.crosshair },
        horzLine: { color: c.crosshair },
      },
      rightPriceScale: {
        borderColor: c.border,
      },
      timeScale: {
        borderColor: c.border,
        timeVisible: false,
      },
      localization: {
        dateFormat: "yyyy/MM/dd",
      },
      handleScale: {
        mouseWheel: !isMobile,
        pinch: true,
        axisPressedMouseMove: !isMobile,
        axisDoubleClickReset: !isMobile,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: !isMobile,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: c.upColor,
      downColor: c.downColor,
      borderUpColor: c.upColor,
      borderDownColor: c.downColor,
      wickUpColor: c.upColor,
      wickDownColor: c.downColor,
      autoscaleInfoProvider: (original: () => AutoscaleInfo | null) => {
        if (!isMobile) return original();
        // Capture the first visible price range and retain it during horizontal
        // scrolling, pinch zooming, data refreshes, and theme changes.
        mobileAutoscaleRef.current ??= original();
        return mobileAutoscaleRef.current;
      },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: c.grid,
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const selectCandleFromEvent = (param: MouseEventParams<Time>) => {
      if (param.time && param.seriesData.has(candleSeries)) {
        setSelectedTime(chartTimeToString(param.time));
      }
    };

    // Both readouts share the selected date. Clicking toggles an explicit lock;
    // leaving the plot alone preserves the last date without locking it.
    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!isMobileViewport() && !pinnedRef.current) selectCandleFromEvent(param);
    };
    const handleClick = (param: MouseEventParams<Time>) => {
      if (isMobileViewport() || !param.time || !param.seriesData.has(candleSeries)) return;
      selectCandleFromEvent(param);
      pinnedRef.current = !pinnedRef.current;
      setIsPinned(pinnedRef.current);
    };

    const handleVisibleRangeChange = (range: LogicalRange | null) => {
      if (!range || !defaultRangeRef.current) return;
      const isModified = !isSameRange(range, defaultRangeRef.current);
      isRangeModifiedRef.current = isModified;
      setIsRangeModified(isModified);
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.subscribeClick(handleClick);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    queueMicrotask(() => setChartReady(true));

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const nextIsMobile = width < MOBILE_BREAKPOINT;
        if (nextIsMobile !== isMobile) mobileAutoscaleRef.current = null;
        chart.applyOptions({
          width,
          height: containerRef.current.clientHeight,
          crosshair: {
            mode: CrosshairMode.Magnet,
          },
          handleScale: {
            mouseWheel: !nextIsMobile,
            pinch: true,
            axisPressedMouseMove: !nextIsMobile,
            axisDoubleClickReset: !nextIsMobile,
          },
          handleScroll: {
            vertTouchDrag: !nextIsMobile,
          },
        });

        if (nextIsMobile !== isMobile) {
          isMobile = nextIsMobile;

          if (dataLengthRef.current > 0) {
            const wasRangeModified = isRangeModifiedRef.current;
            const nextDefaultRange = getDefaultRange(dataLengthRef.current, width);
            defaultRangeRef.current = nextDefaultRange;

            if (!wasRangeModified) {
              chart.timeScale().setVisibleLogicalRange(nextDefaultRange);
            } else {
              const currentRange = chart.timeScale().getVisibleLogicalRange();
              if (currentRange) {
                const isModified = !isSameRange(currentRange, nextDefaultRange);
                isRangeModifiedRef.current = isModified;
                setIsRangeModified(isModified);
              }
            }
          }
        }
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.unsubscribeClick(handleClick);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.remove();
      chartRef.current = null;
      defaultRangeRef.current = null;
      dataLengthRef.current = 0;
      mobileAutoscaleRef.current = null;
      setChartReady(false);
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    const c = resolvedTheme === "light" ? lightColors : darkColors;
    chartRef.current.applyOptions({
      layout: { background: { color: c.background }, textColor: c.textColor },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      crosshair: { vertLine: { color: c.crosshair }, horzLine: { color: c.crosshair } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
    });
    candleSeriesRef.current.applyOptions({
      upColor: c.upColor,
      downColor: c.downColor,
      borderUpColor: c.upColor,
      borderDownColor: c.downColor,
      wickUpColor: c.upColor,
      wickDownColor: c.downColor,
    });
  }, [resolvedTheme]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    if (sortedCandles.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      defaultRangeRef.current = null;
      dataLengthRef.current = 0;
      mobileAutoscaleRef.current = null;
      return;
    }

    const c = resolvedTheme === "light" ? lightColors : darkColors;

    const candleData = sortedCandles.map((candle) => ({
      time: candle.time as `${number}-${number}-${number}`,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    const volumeData = sortedCandles.map((candle) => ({
      time: candle.time as `${number}-${number}-${number}`,
      value: candle.volume,
      color: candle.close >= candle.open ? c.volumeBull : c.volumeBear,
    }));

    const currentRange = isRangeModifiedRef.current ? chartRef.current?.timeScale().getVisibleLogicalRange() : null;
    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    const total = sortedCandles.length;
    const width = containerRef.current?.clientWidth ?? MOBILE_BREAKPOINT;
    const defaultRange = getDefaultRange(total, width);
    dataLengthRef.current = total;
    defaultRangeRef.current = defaultRange;
    chartRef.current?.timeScale().setVisibleLogicalRange(currentRange ?? defaultRange);
  }, [sortedCandles, resolvedTheme]);

  const candleDirectionColor = displayedCandle
    ? displayedCandle.close >= displayedCandle.open ? "var(--color-bull)" : "var(--color-bear)"
    : "var(--color-text-primary)";

  const intervalLabel = interval === "1day" ? "日足" : interval === "1week" ? "週足" : "月足";
  const volumeLabel = displayedCandle?.volume === undefined ? "—" : Math.round(displayedCandle.volume).toLocaleString("ja-JP");
  const volumeReadout = <span className="whitespace-nowrap tabular-nums text-[var(--color-text-muted)]">出来高 {volumeLabel}</span>;

  // One readout moves with the toolbar grid; selection state stays with the chart.
  const readout = (
    <div data-testid="candle-info" className={readoutContainer ? "pt-3 lg:pt-0" : "shrink-0 border-b border-[var(--color-border-subtle)] px-4 py-3 sm:px-6"}>
        {displayedCandle ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums">
                <span className={isMobile && mobileIntervals ? "sr-only" : "rounded-md bg-[var(--color-surface-3)] px-2 py-1 font-medium"}>{selectedCandleExists ? isPinned ? "固定中" : "選択中" : isMobile && mobileIntervals ? "最新" : "最新の足"}</span>
                <span className="font-medium">{displayedCandle.time.replaceAll("-", "/")}</span>
                {!isMobile && <span className="text-[var(--color-text-muted)]">{intervalLabel}</span>}
              </div>
              {isMobile && <div className="ml-auto flex shrink-0 items-center gap-1">{mobileIntervals}</div>}
              {!isMobile && <div className="hidden items-center gap-1 sm:flex">
                <button className="chart-action w-11 !px-0" type="button" aria-label="前の足を表示" disabled={selectedIndex <= 0} onClick={() => selectAdjacent(-1)}><ChevronLeft className="size-4" /></button>
                <button className="chart-action w-11 !px-0" type="button" aria-label="次の足を表示" disabled={selectedIndex < 0 || selectedIndex >= sortedCandles.length - 1} onClick={() => selectAdjacent(1)}><ChevronRight className="size-4" /></button>
                <button className="chart-action" type="button" onClick={returnToLatest} disabled={!selectedCandleExists && !isRangeModified} aria-label="最新の足と表示範囲に戻す"><RotateCcw className="size-3.5" aria-hidden="true" />最新へ</button>
              </div>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 min-[360px]:grid-cols-[1fr_1fr_1fr_1.4fr] sm:grid-cols-4">
              {([
                ["始値", formatPrice(displayedCandle.open)], ["高値", formatPrice(displayedCandle.high)],
                ["安値", formatPrice(displayedCandle.low)], isMobile ? ["出来高", volumeLabel] : ["終値", formatPrice(displayedCandle.close)],
              ] as const).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold tabular-nums sm:text-base" style={{ color: label === "終値" ? candleDirectionColor : "var(--color-text-primary)" }}>{value}</dd>
                </div>
              ))}
            </dl>
            {!isMobile && <div className="mt-2 flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2 py-1 text-xs text-[var(--color-text-muted)]">
              {volumeReadout}
              <div className="flex items-center gap-1 sm:ml-auto">
              <IndicatorReadout
                time={displayedCandle.time}
                intervalLabel={intervalLabel}
                smaEnabled={smaEnabled}
                bollingerEnabled={bollingerEnabled}
                smaData={smaData}
                band={band}
              />
              </div>
            </div>}
          </>
        ) : <span className="text-xs text-[var(--color-text-muted)]">4本値を取得中</span>}

      </div>
  );

  return (
    <div className="relative flex h-full w-full flex-col bg-[var(--color-surface-1)]">
      {readoutContainer ? createPortal(readout, readoutContainer) : readout}
      <div className="relative min-h-[180px] flex-1">
        <div ref={containerRef} className="absolute inset-0" aria-label={isMobile ? "ローソク足チャート。始値・高値・安値・出来高は最新の足を表示しています。" : "ローソク足チャート。カーソル移動で数値を表示。クリックで固定・解除。前後の足は上部のボタンでも選択できます。"} />
      </div>
    </div>
  );
}

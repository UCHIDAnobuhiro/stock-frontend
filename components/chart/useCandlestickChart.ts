"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { isCompactChartViewport } from "@/hooks/useIsCompactChart";
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
import type { CandleResponse } from "@/lib/market-data";
import type { SmaSeriesData, BollingerBandData } from "@/lib/indicators";
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

const VISIBLE_CANDLES_MOBILE = 30;
const VISIBLE_CANDLES_DESKTOP = 60;

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

interface ChartLifecycleOptions {
  sortedCandles: CandleResponse[];
  smaData: SmaSeriesData[];
  bollingerData: BollingerBandData[];
  isCompact: boolean;
}

export function useCandlestickChart({ sortedCandles, smaData, bollingerData, isCompact }: ChartLifecycleOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const defaultRangeRef = useRef<VisibleLogicalRange | null>(null);
  const pendingRangeRef = useRef<VisibleLogicalRange | null>(null);
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
  const candleIndexByTime = useMemo(() => {
    const indexByTime = new Map<string, number>();
    sortedCandles.forEach((candle, index) => {
      if (!indexByTime.has(candle.time)) indexByTime.set(candle.time, index);
    });
    return indexByTime;
  }, [sortedCandles]);
  const latestCandle = sortedCandles.at(-1);
  const selectedIndex = isCompact || selectedTime === null ? -1 : candleIndexByTime.get(selectedTime) ?? -1;
  const selectedCandle = sortedCandles[selectedIndex];
  const selectedCandleExists = selectedCandle !== undefined;
  const displayedCandle = selectedCandle ?? latestCandle ?? null;
  const displayedIndex = displayedCandle ? candleIndexByTime.get(displayedCandle.time) ?? -1 : -1;
  // 指標シリーズの setData より先に、操作済みの時間範囲を退避する。
  useEffect(() => {
    pendingRangeRef.current = isRangeModifiedRef.current
      ? chartRef.current?.timeScale().getVisibleLogicalRange() ?? null
      : null;
  }, [sortedCandles]);
  useIndicatorSeries(chartRef, smaData, chartReady);
  useBollingerSeries(chartRef, bollingerData, chartReady);
  const selectAdjacent = (offset: number) => {
    const candle = sortedCandles[displayedIndex + offset];
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

    let isCompact = isCompactChartViewport();
    let isNarrow = containerRef.current.clientWidth < MOBILE_BREAKPOINT;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: c.background },
        textColor: c.textColor,
        panes: { enableResize: false, separatorColor: c.border, separatorHoverColor: c.border },
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
        mouseWheel: !isCompact,
        pinch: true,
        axisPressedMouseMove: !isCompact,
        axisDoubleClickReset: !isCompact,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: !isCompact,
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
        if (!isCompact) return original();
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
      lastValueVisible: false,
      priceLineVisible: false,
    }, isCompact ? 1 : 0);

    const updateVolumePane = () => {
      volumeSeries.moveToPane(isCompact ? 1 : 0);
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: isCompact ? 0.15 : 0.8, bottom: 0 },
      });
      chart.panes()[0].setStretchFactor(isCompact ? 5 : 1);
      if (isCompact) chart.panes()[1].setStretchFactor(1);
    };
    updateVolumePane();

    const selectCandleFromEvent = (param: MouseEventParams<Time>) => {
      if (param.time && param.seriesData.has(candleSeries)) {
        setSelectedTime(chartTimeToString(param.time));
      }
    };

    // Both readouts share the selected date. Clicking toggles an explicit lock;
    // leaving the plot alone preserves the last date without locking it.
    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!isCompactChartViewport() && !pinnedRef.current) selectCandleFromEvent(param);
    };
    const handleClick = (param: MouseEventParams<Time>) => {
      if (isCompactChartViewport() || !param.time || !param.seriesData.has(candleSeries)) return;
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
        const nextIsCompact = isCompactChartViewport();
        if (nextIsCompact !== isCompact) mobileAutoscaleRef.current = null;
        chart.applyOptions({
          width,
          height: containerRef.current.clientHeight,
          crosshair: {
            mode: CrosshairMode.Magnet,
          },
          handleScale: {
            mouseWheel: !nextIsCompact,
            pinch: true,
            axisPressedMouseMove: !nextIsCompact,
            axisDoubleClickReset: !nextIsCompact,
          },
          handleScroll: {
            vertTouchDrag: !nextIsCompact,
          },
        });

        if (nextIsCompact !== isCompact) {
          isCompact = nextIsCompact;
          updateVolumePane();
        }

        const nextIsNarrow = width < MOBILE_BREAKPOINT;
        if (nextIsNarrow !== isNarrow) {
          isNarrow = nextIsNarrow;
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
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      defaultRangeRef.current = null;
      pendingRangeRef.current = null;
      dataLengthRef.current = 0;
      mobileAutoscaleRef.current = null;
      setChartReady(false);
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    const c = resolvedTheme === "light" ? lightColors : darkColors;
    chartRef.current.applyOptions({
      layout: { background: { color: c.background }, textColor: c.textColor, panes: { separatorColor: c.border, separatorHoverColor: c.border } },
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
    if (!candleSeriesRef.current) return;

    if (sortedCandles.length === 0) {
      candleSeriesRef.current.setData([]);
      defaultRangeRef.current = null;
      pendingRangeRef.current = null;
      dataLengthRef.current = 0;
      mobileAutoscaleRef.current = null;
      return;
    }

    const candleData = sortedCandles.map((candle) => ({
      time: candle.time as `${number}-${number}-${number}`,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeriesRef.current.setData(candleData);
  }, [sortedCandles]);

  useEffect(() => {
    if (!volumeSeriesRef.current) return;
    const c = resolvedTheme === "light" ? lightColors : darkColors;
    const volumeData = sortedCandles.map((candle) => ({
      time: candle.time as `${number}-${number}-${number}`,
      value: candle.volume,
      color: candle.close >= candle.open ? c.volumeBull : c.volumeBear,
    }));
    volumeSeriesRef.current.setData(volumeData);
  }, [sortedCandles, resolvedTheme]);

  useEffect(() => {
    if (sortedCandles.length === 0) return;
    const total = sortedCandles.length;
    const width = containerRef.current?.clientWidth ?? MOBILE_BREAKPOINT;
    const defaultRange = getDefaultRange(total, width);
    dataLengthRef.current = total;
    defaultRangeRef.current = defaultRange;
    chartRef.current?.timeScale().setVisibleLogicalRange(pendingRangeRef.current ?? defaultRange);
    pendingRangeRef.current = null;
  }, [sortedCandles]);

  return {
    containerRef,
    displayedCandle,
    displayedIndex,
    selectedCandleExists,
    isPinned,
    isRangeModified,
    selectAdjacent,
    returnToLatest,
  };
}

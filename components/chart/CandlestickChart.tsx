"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  CandlestickSeries,
  CrosshairMode,
  HistogramSeries,
  type IChartApi,
  type LogicalRange,
  type MouseEventParams,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { CandleResponse } from "@/hooks/useCandles";
import type { Interval } from "@/hooks/useSelectedSymbol";
import { SMA_PERIODS, getSmaColor, BOLLINGER_PERIOD, BOLLINGER_COLORS } from "@/lib/indicators";
import { useIndicatorSeries } from "./useIndicatorSeries";
import { useBollingerSeries, type BollingerKey } from "./useBollingerSeries";

const darkColors = {
  background: "#0d1117",
  textColor: "#8b949e",
  grid: "#21262d",
  crosshair: "#484f58",
  border: "#30363d",
  upColor: "#3fb950",
  downColor: "#f85149",
  volumeBull: "#196c2e",
  volumeBear: "#8e1a15",
};

const lightColors = {
  background: "#ffffff",
  textColor: "#787b86",
  grid: "#f0f3fa",
  crosshair: "#9598a1",
  border: "#e0e3eb",
  upColor: "#089981",
  downColor: "#f23645",
  volumeBull: "#5cbcb3",
  volumeBear: "#f78c95",
};

const MOBILE_BREAKPOINT = 640;
const VISIBLE_CANDLES_MOBILE = 30;
const VISIBLE_CANDLES_DESKTOP = 60;

interface CandlestickChartProps {
  candles: CandleResponse[];
  interval: Interval;
  smaEnabled: boolean;
  bollingerEnabled: boolean;
}

interface SelectedCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
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

function candleToSelected(candle: CandleResponse): SelectedCandle {
  return {
    time: candle.time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
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

export function CandlestickChart({ candles, interval, smaEnabled, bollingerEnabled }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const smaLegendRef = useRef<HTMLDivElement>(null);
  const bbLegendRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const defaultRangeRef = useRef<VisibleLogicalRange | null>(null);
  const dataLengthRef = useRef(0);
  const isRangeModifiedRef = useRef(false);
  const [selectedCandle, setSelectedCandle] = useState<SelectedCandle | null>(null);
  const { resolvedTheme } = useTheme();
  // resolvedTheme は SSR/ハイドレーション前は undefined になる。
  // ThemeProvider は CandlestickChart より先にマウントされるため、
  // useEffect 実行時点では ref 経由で正しいテーマを取得できる。
  const resolvedThemeRef = useRef(resolvedTheme);
  useEffect(() => {
    resolvedThemeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  const intervalRef = useRef(interval);
  useEffect(() => {
    intervalRef.current = interval;
  }, [interval]);

  // チャート生成完了フラグ（useIndicatorSeries の effect をチャート生成後に走らせるため）
  const [chartReady, setChartReady] = useState(false);

  // SMAシリーズ管理（period → ISeriesApi<"Line">）
  const smaSeriesMapRef = useIndicatorSeries(chartRef, candles, interval, smaEnabled, chartReady);

  // ボリンジャーバンドシリーズ管理
  const bbSeriesMapRef = useBollingerSeries(chartRef, candles, bollingerEnabled, chartReady);

  const latestCandle = useMemo(
    () => [...candles].sort((a, b) => (a.time < b.time ? -1 : 1)).at(-1),
    [candles],
  );
  const selectedCandleExists = selectedCandle !== null && candles.some((candle) => (
    candle.time === selectedCandle.time
    && candle.open === selectedCandle.open
    && candle.high === selectedCandle.high
    && candle.low === selectedCandle.low
    && candle.close === selectedCandle.close
  ));
  const displayedCandle = selectedCandleExists
    ? selectedCandle
    : latestCandle ? candleToSelected(latestCandle) : null;

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
        mode: isMobile ? CrosshairMode.Hidden : CrosshairMode.Magnet,
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
        pinch: !isMobile,
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
      // スマホでは足を選択せず、4本値を常に最新足へ固定する。
      if (isMobile) return;
      if (!param.time) return;

      const data = param.seriesData.get(candleSeries) as
        | { open: number; high: number; low: number; close: number }
        | undefined;
      if (!data) return;

      const volData = param.seriesData.get(volumeSeries) as { value: number } | undefined;
      setSelectedCandle({
        time: chartTimeToString(param.time),
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: volData?.value,
      });
    };

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      selectCandleFromEvent(param);
      if (!smaLegendRef.current) return;
      const colors = resolvedThemeRef.current === "light" ? lightColors : darkColors;

      if (!param.time) return;
      const fmt = (n: number) => n.toFixed(2);

      // ラベルと値のペアを折り返し不可の1要素として行に追加する
      // （折り返しはペアの間でのみ発生させ、ラベルと値の泣き別れを防ぐ）
      const appendPair = (
        row: HTMLDivElement,
        labelText: string,
        valueText: string,
        valueColor?: string,
      ) => {
        const pair = document.createElement("span");
        pair.className = "whitespace-nowrap";
        const labelSpan = document.createElement("span");
        labelSpan.style.color = colors.textColor;
        labelSpan.textContent = labelText;
        const valueB = document.createElement("b");
        if (valueColor) valueB.style.color = valueColor;
        valueB.textContent = ` ${valueText}`;
        pair.append(labelSpan, valueB);
        row.appendChild(pair);
      };

      // PC表示用: SMA値
      smaLegendRef.current.textContent = "";
      const smaMap = smaSeriesMapRef.current;
      const periods = SMA_PERIODS[intervalRef.current];
      periods.forEach((period, idx) => {
        const series = smaMap.get(period);
        if (!series) return;
        const smaData = param.seriesData.get(series) as { value: number } | undefined;
        if (smaData === undefined) return;

        appendPair(smaLegendRef.current!, `SMA(${period})`, fmt(smaData.value), getSmaColor(idx));
      });

      // PC表示用: ボリンジャーバンド値
      if (bbLegendRef.current) {
        bbLegendRef.current.textContent = "";
        const bbMap = bbSeriesMapRef.current;
        if (bbMap.size > 0) {
          const bbEntries: Array<{ label: string; key: string; color: string }> = [
            { label: `BB(${BOLLINGER_PERIOD})`, key: "middle", color: BOLLINGER_COLORS.middle },
            { label: "+1σ", key: "upper1", color: BOLLINGER_COLORS.sigma1 },
            { label: "-1σ", key: "lower1", color: BOLLINGER_COLORS.sigma1 },
            { label: "+2σ", key: "upper2", color: BOLLINGER_COLORS.sigma2 },
            { label: "-2σ", key: "lower2", color: BOLLINGER_COLORS.sigma2 },
            { label: "+3σ", key: "upper3", color: BOLLINGER_COLORS.sigma3 },
            { label: "-3σ", key: "lower3", color: BOLLINGER_COLORS.sigma3 },
          ];
          bbEntries.forEach(({ label, key, color }) => {
            const series = bbMap.get(key as BollingerKey);
            if (!series) return;
            const d = param.seriesData.get(series) as { value: number } | undefined;
            if (d === undefined) return;

            appendPair(bbLegendRef.current!, label, fmt(d.value), color);
          });
        }
      }
    };

    const handleVisibleRangeChange = (range: LogicalRange | null) => {
      if (!range || !defaultRangeRef.current) return;
      const isModified = !isSameRange(range, defaultRangeRef.current);
      isRangeModifiedRef.current = isModified;
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.subscribeClick(selectCandleFromEvent);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    queueMicrotask(() => setChartReady(true));

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const nextIsMobile = width < MOBILE_BREAKPOINT;
        chart.applyOptions({
          width,
          height: containerRef.current.clientHeight,
          crosshair: {
            mode: nextIsMobile ? CrosshairMode.Hidden : CrosshairMode.Magnet,
          },
          handleScale: {
            mouseWheel: !nextIsMobile,
            pinch: !nextIsMobile,
            axisPressedMouseMove: !nextIsMobile,
            axisDoubleClickReset: !nextIsMobile,
          },
          handleScroll: {
            vertTouchDrag: !nextIsMobile,
          },
        });

        if (nextIsMobile !== isMobile) {
          isMobile = nextIsMobile;

          if (nextIsMobile) {
            setSelectedCandle(null);
          }

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
      chart.unsubscribeClick(selectCandleFromEvent);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.remove();
      chartRef.current = null;
      defaultRangeRef.current = null;
      dataLengthRef.current = 0;
      setChartReady(false);
    };
  }, [smaSeriesMapRef, bbSeriesMapRef]);

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

    if (candles.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      defaultRangeRef.current = null;
      dataLengthRef.current = 0;
      return;
    }

    const c = resolvedTheme === "light" ? lightColors : darkColors;
    const sorted = [...candles].sort((a, b) => (a.time < b.time ? -1 : 1));

    const candleData = sorted.map((candle) => ({
      time: candle.time as `${number}-${number}-${number}`,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    const volumeData = sorted.map((candle) => ({
      time: candle.time as `${number}-${number}-${number}`,
      value: candle.volume,
      color: candle.close >= candle.open ? c.volumeBull : c.volumeBear,
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    const total = sorted.length;
    const width = containerRef.current?.clientWidth ?? MOBILE_BREAKPOINT;
    const defaultRange = getDefaultRange(total, width);
    dataLengthRef.current = total;
    defaultRangeRef.current = defaultRange;
    chartRef.current?.timeScale().setVisibleLogicalRange(defaultRange);
  }, [candles, resolvedTheme]);

  const candleDirectionColor = displayedCandle
    ? displayedCandle.close >= displayedCandle.open ? "var(--color-bull)" : "var(--color-bear)"
    : "var(--color-text-primary)";

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* スマホではチャート外の固定ストリップ、PCでは従来どおりチャート上へ重ねる */}
      <div
        data-testid="candle-info"
        className="z-10 shrink-0 border-b bg-[var(--color-surface-1)] px-3 py-2 sm:pointer-events-none sm:absolute sm:left-3 sm:right-20 sm:top-3 sm:border-0 sm:bg-transparent sm:p-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        {displayedCandle ? (
          <>
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px] sm:mb-0 sm:justify-start sm:text-xs">
              <span className="font-medium tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                {displayedCandle.time.replaceAll("-", "/")}
              </span>
              {displayedCandle.volume !== undefined && (
                <span className="tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                  出来高 {Math.round(displayedCandle.volume).toLocaleString()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-x-3 font-mono sm:flex sm:flex-wrap sm:gap-x-2">
              {([
                ["始値", displayedCandle.open],
                ["高値", displayedCandle.high],
                ["安値", displayedCandle.low],
                ["終値", displayedCandle.close],
              ] as const).map(([label, value]) => (
                <span key={label} className="flex min-w-0 flex-col sm:block sm:whitespace-nowrap">
                  <span className="text-[10px] sm:text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                  <b
                    className="truncate text-xs tabular-nums sm:ml-1"
                    style={{ color: label === "終値" ? candleDirectionColor : "var(--color-text-primary)" }}
                  >
                    {value.toFixed(2)}
                  </b>
                </span>
              ))}
            </div>
          </>
        ) : (
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>4本値を取得中</span>
        )}
        <div ref={smaLegendRef} className="hidden text-xs font-mono sm:flex sm:flex-wrap sm:gap-x-2" />
        <div ref={bbLegendRef} className="hidden text-xs font-mono sm:flex sm:flex-wrap sm:gap-x-2" />
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}

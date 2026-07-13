"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
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

export function CandlestickChart({ candles, interval, smaEnabled, bollingerEnabled }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const smaLegendRef = useRef<HTMLDivElement>(null);
  const bbLegendRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
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

  useEffect(() => {
    if (!containerRef.current) return;

    const c = resolvedThemeRef.current === "light" ? lightColors : darkColors;

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

    chart.subscribeCrosshairMove((param) => {
      if (!legendRef.current || !smaLegendRef.current) return;
      const colors = resolvedThemeRef.current === "light" ? lightColors : darkColors;

      if (!param.time) return;

      const data = param.seriesData.get(candleSeries) as
        | { open: number; high: number; low: number; close: number }
        | undefined;

      if (!data) return;

      const volData = param.seriesData.get(volumeSeries) as
        | { value: number }
        | undefined;

      const color = data.close >= data.open ? colors.upColor : colors.downColor;
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

      // 1行目: OHLCV
      legendRef.current.style.color = color;
      legendRef.current.textContent = "";

      const fields: Array<[string, string]> = [
        ["始値", fmt(data.open)],
        ["高値", fmt(data.high)],
        ["安値", fmt(data.low)],
        ["終値", fmt(data.close)],
        ...(volData !== undefined
          ? [["出来高", Math.round(volData.value).toLocaleString()] as [string, string]]
          : []),
      ];

      fields.forEach(([labelText, valueText]) => {
        appendPair(legendRef.current!, labelText, valueText);
      });

      // 2行目: SMA値
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

      // 3行目: ボリンジャーバンド値
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
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    queueMicrotask(() => setChartReady(true));

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
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
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

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
    const visibleCount = (containerRef.current?.clientWidth ?? MOBILE_BREAKPOINT) < MOBILE_BREAKPOINT
      ? VISIBLE_CANDLES_MOBILE
      : VISIBLE_CANDLES_DESKTOP;
    chartRef.current?.timeScale().setVisibleLogicalRange({
      from: Math.max(0, total - visibleCount),
      to: total - 1,
    });
  }, [candles, resolvedTheme]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {/* right-20 は価格軸（実測 約72px）と重ならないための制約 */}
      <div className="pointer-events-none absolute left-3 right-20 top-3 z-10 flex flex-col gap-0.5">
        <div ref={legendRef} className="text-xs font-mono flex flex-wrap gap-x-2" />
        <div ref={smaLegendRef} className="text-xs font-mono flex flex-wrap gap-x-2" />
        <div ref={bbLegendRef} className="text-xs font-mono flex flex-wrap gap-x-2" />
      </div>
    </div>
  );
}

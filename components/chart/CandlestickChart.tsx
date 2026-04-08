"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import type { CandleResponse } from "@/hooks/useCandles";

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

interface CandlestickChartProps {
  candles: CandleResponse[];
}

export function CandlestickChart({ candles }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
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
        timeVisible: true,
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
      if (!legendRef.current) return;
      const c = resolvedThemeRef.current === "light" ? lightColors : darkColors;

      if (!param.time) return;

      const data = param.seriesData.get(candleSeries) as
        | { open: number; high: number; low: number; close: number }
        | undefined;

      if (!data) return;

      const volData = param.seriesData.get(volumeSeries) as
        | { value: number }
        | undefined;

      const color = data.close >= data.open ? c.upColor : c.downColor;
      const fmt = (n: number) => n.toFixed(2);

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

      fields.forEach(([labelText, valueText], i) => {
        if (i > 0) legendRef.current!.appendChild(document.createTextNode("\u00a0\u00a0"));
        const labelSpan = document.createElement("span");
        labelSpan.style.color = c.textColor;
        labelSpan.textContent = labelText;
        const valueB = document.createElement("b");
        valueB.textContent = valueText;
        legendRef.current!.appendChild(labelSpan);
        legendRef.current!.appendChild(document.createTextNode(" "));
        legendRef.current!.appendChild(valueB);
      });
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

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
    chartRef.current?.timeScale().fitContent();
  }, [candles, resolvedTheme]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div
        ref={legendRef}
        className="pointer-events-none absolute left-3 top-3 z-10 text-xs font-mono"
      />
    </div>
  );
}

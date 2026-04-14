import { useEffect, useRef } from "react";
import { LineSeries, type IChartApi, type ISeriesApi } from "lightweight-charts";
import type { CandleResponse } from "@/hooks/useCandles";
import type { Interval } from "@/hooks/useSelectedSymbol";
import { SMA_PERIODS, calcSMA, getSmaColor } from "@/lib/indicators";

export function useIndicatorSeries(
  chartRef: React.RefObject<IChartApi | null>,
  candles: CandleResponse[],
  interval: Interval,
  smaEnabled: boolean,
  chartReady: boolean
) {
  // period → ISeriesApi<"Line">
  const seriesMapRef = useRef<Map<number, ISeriesApi<"Line">>>(new Map());

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const currentMap = seriesMapRef.current;
    const periods = SMA_PERIODS[interval];

    // 既存シリーズを全削除
    for (const series of currentMap.values()) {
      chart.removeSeries(series);
    }
    currentMap.clear();

    if (!smaEnabled || candles.length === 0) return;

    const sorted = [...candles].sort((a, b) => (a.time < b.time ? -1 : 1));
    const closeData = sorted.map((c) => ({ time: c.time, value: c.close }));

    periods.forEach((period, idx) => {
      const series = chart.addSeries(LineSeries, {
        color: getSmaColor(idx),
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const smaData = calcSMA(closeData, period);
      series.setData(
        smaData.map((d) => ({
          time: d.time as `${number}-${number}-${number}`,
          value: d.value,
        }))
      );
      currentMap.set(period, series);
    });
  }, [chartRef, candles, interval, smaEnabled, chartReady]);

  useEffect(() => {
    return () => {
      seriesMapRef.current.clear();
    };
  }, []);

  return seriesMapRef;
}

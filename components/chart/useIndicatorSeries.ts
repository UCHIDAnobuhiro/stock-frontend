import { useEffect, useRef } from "react";
import { LineSeries, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { getSmaColor, type SmaSeriesData } from "@/lib/indicators";

export function useIndicatorSeries(
  chartRef: React.RefObject<IChartApi | null>,
  data: SmaSeriesData[],
  chartReady: boolean
) {
  // period → ISeriesApi<"Line">
  const seriesMapRef = useRef<Map<number, ISeriesApi<"Line">>>(new Map());

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const currentMap = seriesMapRef.current;

    // 既存シリーズを全削除
    for (const series of currentMap.values()) {
      chart.removeSeries(series);
    }
    currentMap.clear();

    data.forEach(({ period, values }, idx) => {
      const series = chart.addSeries(LineSeries, {
        color: getSmaColor(idx),
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(
        values.map((d) => ({
          time: d.time as `${number}-${number}-${number}`,
          value: d.value,
        }))
      );
      currentMap.set(period, series);
    });
  }, [chartRef, data, chartReady]);

  return seriesMapRef;
}

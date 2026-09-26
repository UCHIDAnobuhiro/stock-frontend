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
  const ownerRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chartReady || !chart) return;

    const currentMap = seriesMapRef.current;
    if (ownerRef.current !== chart) {
      currentMap.clear();
      ownerRef.current = chart;
    }

    const periods = new Set(data.map(({ period }) => period));
    for (const [period, series] of currentMap) {
      if (!periods.has(period)) {
        chart.removeSeries(series);
        currentMap.delete(period);
      }
    }

    data.forEach(({ period, values }, idx) => {
      let series = currentMap.get(period);
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: getSmaColor(idx),
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        currentMap.set(period, series);
      } else {
        series.applyOptions({ color: getSmaColor(idx) });
      }
      series.setData(
        values.map((d) => ({
          time: d.time as `${number}-${number}-${number}`,
          value: d.value,
        }))
      );
    });
  }, [chartRef, data, chartReady]);

  useEffect(() => {
    if (!chartReady) return;
    const chart = chartRef.current;
    const seriesMap = seriesMapRef.current;
    return () => {
      if (!chart || ownerRef.current !== chart) return;
      for (const series of seriesMap.values()) chart.removeSeries(series);
      seriesMap.clear();
      ownerRef.current = null;
    };
  }, [chartRef, chartReady]);

  return seriesMapRef;
}

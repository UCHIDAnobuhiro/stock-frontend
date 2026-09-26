import { useEffect, useRef } from "react";
import { LineSeries, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { BOLLINGER_SERIES, type BollingerBandData, type BollingerKey } from "@/lib/indicators";

export function useBollingerSeries(
  chartRef: React.RefObject<IChartApi | null>,
  data: BollingerBandData[],
  chartReady: boolean
) {
  const seriesMapRef = useRef<Map<BollingerKey, ISeriesApi<"Line">>>(new Map());
  const ownerRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chartReady || !chart) return;

    const currentMap = seriesMapRef.current;
    if (ownerRef.current !== chart) {
      currentMap.clear();
      ownerRef.current = chart;
    }

    if (data.length === 0) {
      for (const series of currentMap.values()) chart.removeSeries(series);
      currentMap.clear();
      return;
    }

    BOLLINGER_SERIES.forEach(({ key, color }) => {
      let series = currentMap.get(key);
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        currentMap.set(key, series);
      }
      series.setData(
        data.map((d) => ({
          time: d.time as `${number}-${number}-${number}`,
          value: d[key],
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

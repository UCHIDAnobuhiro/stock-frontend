import { useEffect, useRef } from "react";
import { LineSeries, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { BOLLINGER_SERIES, type BollingerBandData, type BollingerKey } from "@/lib/indicators";

export function useBollingerSeries(
  chartRef: React.RefObject<IChartApi | null>,
  data: BollingerBandData[],
  chartReady: boolean
) {
  const seriesMapRef = useRef<Map<BollingerKey, ISeriesApi<"Line">>>(new Map());

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const currentMap = seriesMapRef.current;

    for (const series of currentMap.values()) {
      chart.removeSeries(series);
    }
    currentMap.clear();

    if (data.length === 0) return;

    BOLLINGER_SERIES.forEach(({ key, color }) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(
        data.map((d) => ({
          time: d.time as `${number}-${number}-${number}`,
          value: d[key],
        }))
      );
      currentMap.set(key, series);
    });
  }, [chartRef, data, chartReady]);

  return seriesMapRef;
}

"use client";

import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { useDefaultWatchlistSymbol } from "@/hooks/useDefaultWatchlistSymbol";
import { useCandles } from "@/hooks/useCandles";
import { useIndicators } from "@/hooks/useIndicators";
import { ApiError } from "@/lib/api";
import { useNavigationLoading } from "@/components/providers/NavigationLoadingProvider";
import { ChartLoadingOverlay } from "@/components/ui/LoadingIndicator";
import { ChartToolbar } from "./ChartToolbar";
import { CandlestickChart } from "./CandlestickChart";
import { ChartSkeleton } from "./ChartSkeleton";
import { ChartEmpty } from "./ChartEmpty";

export function ChartContainer() {
  const { symbol, interval } = useSelectedSymbol();
  const { isInitializing } = useDefaultWatchlistSymbol();
  const { candles, isLoading, error } = useCandles(symbol, interval);
  const { smaEnabled, toggleSma, bollingerEnabled, toggleBollinger } = useIndicators();
  const { isChartPending } = useNavigationLoading();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChartToolbar smaEnabled={smaEnabled} toggleSma={toggleSma} bollingerEnabled={bollingerEnabled} toggleBollinger={toggleBollinger} />
      <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
        {isInitializing && !symbol ? (
          <ChartSkeleton />
        ) : !symbol ? (
          <ChartEmpty />
        ) : isLoading ? (
          <ChartSkeleton />
        ) : error ? (
          <div
            className="flex h-full items-center justify-center text-sm"
            style={{ color: "var(--color-bear)" }}
          >
            {error instanceof ApiError ? error.message : "データの取得に失敗しました"}
          </div>
        ) : candles.length === 0 ? (
          <ChartEmpty message="データがありません" />
        ) : (
          <CandlestickChart candles={candles} interval={interval} smaEnabled={smaEnabled} bollingerEnabled={bollingerEnabled} />
        )}
        {isChartPending && <ChartLoadingOverlay />}
      </div>
    </div>
  );
}

"use client";

import { useIsCompactChart } from "@/hooks/useIsCompactChart";
import { useState } from "react";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { useDefaultWatchlistSymbol } from "@/hooks/useDefaultWatchlistSymbol";
import { useCandles } from "@/hooks/useCandles";
import { useIndicators } from "@/hooks/useIndicators";
import { ApiError } from "@/lib/api";
import { useNavigationLoading } from "@/components/providers/NavigationLoadingProvider";
import { ChartLoadingOverlay } from "@/components/ui/LoadingIndicator";
import { ChartDisplayControls, ChartIntervalControls } from "./ChartDisplayControls";
import { ChartToolbar } from "./ChartToolbar";
import { CandlestickChart } from "./CandlestickChart";
import { ChartSkeleton } from "./ChartSkeleton";
import { ChartEmpty } from "./ChartEmpty";

export function ChartContainer() {
  const isCompact = useIsCompactChart();
  const [readoutContainer, setReadoutContainer] = useState<HTMLDivElement | null>(null);
  const { symbol, interval } = useSelectedSymbol();
  const { isInitializing } = useDefaultWatchlistSymbol();
  const { candles, isLoading, error } = useCandles(symbol, interval);
  const { smaEnabled, toggleSma, bollingerEnabled, toggleBollinger } = useIndicators();
  const { isChartPending } = useNavigationLoading();

  const hasChart = !!symbol && !isLoading && !error && candles.length > 0;

  return (
    <div className="flex min-h-[560px] flex-1 flex-col bg-[var(--color-surface-1)] sm:min-h-[600px] xl:grid xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)] xl:grid-rows-[auto_auto_minmax(280px,1fr)] xl:pb-4">
      <ChartToolbar isPending={isChartPending} readoutRef={setReadoutContainer} isLoading={isLoading} />
      {isCompact && !hasChart && <div className="flex justify-end px-4 pb-3"><ChartIntervalControls compact isPending={isChartPending} /></div>}
      <div className="relative ml-4 min-h-[280px] flex-1 overflow-hidden rounded-l-xl sm:mx-6 sm:rounded-xl xl:col-span-2 xl:row-start-3" style={{ backgroundColor: "var(--color-surface-1)" }}>
        {isInitializing && !symbol ? (
          <ChartSkeleton />
        ) : !symbol ? (
          <ChartEmpty />
        ) : isLoading ? (
          <><ChartSkeleton /><ChartLoadingOverlay label={`${symbol}・${interval === "1day" ? "日足" : interval === "1week" ? "週足" : "月足"}を読み込んでいます…`} /></>
        ) : error ? (
          <div
            role="alert"
            className="flex h-full items-center justify-center text-sm"
            style={{ color: "var(--color-bear)" }}
          >
            {error instanceof ApiError ? error.message : "データの取得に失敗しました"}
          </div>
        ) : candles.length === 0 ? (
          <ChartEmpty message="データがありません" />
        ) : (
          <CandlestickChart key={`${symbol}:${interval}`} readoutContainer={readoutContainer} mobileIntervals={<ChartIntervalControls compact isPending={isChartPending} />} candles={candles} interval={interval} smaEnabled={smaEnabled} bollingerEnabled={bollingerEnabled} />
        )}
        {isChartPending && <ChartLoadingOverlay />}
      </div>
      {!isCompact && <ChartDisplayControls smaEnabled={smaEnabled} toggleSma={toggleSma} bollingerEnabled={bollingerEnabled} toggleBollinger={toggleBollinger} isPending={isChartPending} />}
    </div>
  );
}

"use client";

import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { useCandles } from "@/hooks/useCandles";
import { useIndicators } from "@/hooks/useIndicators";
import { ApiError } from "@/lib/api";
import { ChartToolbar } from "./ChartToolbar";
import { CandlestickChart } from "./CandlestickChart";
import { ChartSkeleton } from "./ChartSkeleton";
import { ChartEmpty } from "./ChartEmpty";

export function ChartContainer() {
  const { symbol, interval } = useSelectedSymbol();
  const { candles, isLoading, error } = useCandles(symbol, interval);
  const { smaEnabled, toggleSma, bollingerEnabled, toggleBollinger } = useIndicators();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChartToolbar smaEnabled={smaEnabled} toggleSma={toggleSma} bollingerEnabled={bollingerEnabled} toggleBollinger={toggleBollinger} />
      <div className="flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
        {!symbol ? (
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
        ) : (
          <CandlestickChart candles={candles} interval={interval} smaEnabled={smaEnabled} bollingerEnabled={bollingerEnabled} />
        )}
      </div>
    </div>
  );
}

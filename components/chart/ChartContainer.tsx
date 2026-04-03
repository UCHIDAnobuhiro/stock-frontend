"use client";

import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { useCandles } from "@/hooks/useCandles";
import { ChartToolbar } from "./ChartToolbar";
import { CandlestickChart } from "./CandlestickChart";
import { ChartSkeleton } from "./ChartSkeleton";
import { ChartEmpty } from "./ChartEmpty";

export function ChartContainer() {
  const { symbol, interval } = useSelectedSymbol();
  const { candles, isLoading, error } = useCandles(symbol, interval);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChartToolbar />
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
            データの取得に失敗しました
          </div>
        ) : (
          <CandlestickChart candles={candles} />
        )}
      </div>
    </div>
  );
}

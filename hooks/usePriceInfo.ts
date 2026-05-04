"use client";

import { useMemo } from "react";
import { useCandles } from "./useCandles";
import type { Interval } from "./useSelectedSymbol";

export function usePriceInfo(code: string | null, interval: Interval = "1day") {
  const { candles } = useCandles(code, interval);
  const sorted = useMemo(
    () => [...candles].sort((a, b) => (a.time < b.time ? -1 : 1)),
    [candles]
  );
  const latest = sorted.at(-1);
  const prev = sorted.at(-2);
  if (!latest || !prev || prev.close === 0) return null;
  const change = latest.close - prev.close;
  const changePercent = (change / prev.close) * 100;
  return { close: latest.close, change, changePercent };
}

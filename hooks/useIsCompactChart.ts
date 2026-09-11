"use client";

import { useSyncExternalStore } from "react";

function subscribeViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
export const COMPACT_CHART_BREAKPOINT = 1280;
export const isCompactChartViewport = () => window.innerWidth < COMPACT_CHART_BREAKPOINT;
const serverSnapshot = () => false;

export function useIsCompactChart() {
  return useSyncExternalStore(subscribeViewport, isCompactChartViewport, serverSnapshot);
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useNavigationLoading } from "@/components/providers/NavigationLoadingProvider";

import { isInterval, type Interval } from "@/lib/market-data";

export type { Interval } from "@/lib/market-data";

export function useSelectedSymbol() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { startNavigation } = useNavigationLoading();

  const rawSymbol = searchParams.get("symbol");
  const symbol = rawSymbol?.trim() || null;
  const rawInterval = searchParams.get("interval");
  const interval: Interval = isInterval(rawInterval) ? rawInterval : "1day";

  const createSymbolUrl = useCallback(
    (code: string, keepInterval: boolean) => {
      // 連続操作で useSearchParams の再レンダー前でも最新の URL を使う。
      const params = new URLSearchParams(window.location.search);
      params.set("symbol", code);
      if (!keepInterval) params.set("interval", "1day");
      return `${pathname}?${params.toString()}`;
    },
    [pathname]
  );

  // 同一ページのクエリ変更では Server Component を再実行せず、
  // Next.js と同期する History API で URL と戻る・進む履歴を更新する。
  const setSymbol = useCallback(
    (code: string, keepInterval = true) => {
      startNavigation("chart", () => {
        window.history.pushState(null, "", createSymbolUrl(code, keepInterval));
      });
    },
    [createSymbolUrl, startNavigation]
  );

  const replaceSymbol = useCallback(
    (code: string, keepInterval = true) => {
      startNavigation("chart", () => {
        window.history.replaceState(null, "", createSymbolUrl(code, keepInterval));
      });
    },
    [createSymbolUrl, startNavigation]
  );

  const setInterval = useCallback(
    (value: Interval) => {
      const params = new URLSearchParams(window.location.search);
      params.set("interval", value);
      startNavigation("chart", () => {
        window.history.pushState(null, "", `${pathname}?${params.toString()}`);
      });
    },
    [pathname, startNavigation]
  );

  return { symbol, interval, setSymbol, replaceSymbol, setInterval };
}

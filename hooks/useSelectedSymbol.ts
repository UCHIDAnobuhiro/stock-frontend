"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useNavigationLoading } from "@/components/providers/NavigationLoadingProvider";

export type Interval = "1day" | "1week" | "1month";

const isInterval = (v: string | null): v is Interval =>
  v === "1day" || v === "1week" || v === "1month";

export function useSelectedSymbol() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { startNavigation } = useNavigationLoading();

  const rawSymbol = searchParams.get("symbol");
  const symbol = rawSymbol?.trim() || null;
  const rawInterval = searchParams.get("interval");
  const interval: Interval = isInterval(rawInterval) ? rawInterval : "1day";

  const createSymbolUrl = useCallback(
    (code: string, keepInterval: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("symbol", code);
      if (!keepInterval) params.set("interval", "1day");
      return `${pathname}?${params.toString()}`;
    },
    [pathname, searchParams]
  );

  const setSymbol = useCallback(
    (code: string, keepInterval = true) => {
      startNavigation("chart", () => {
        router.push(createSymbolUrl(code, keepInterval), { scroll: false });
      });
    },
    [createSymbolUrl, router, startNavigation]
  );

  const replaceSymbol = useCallback(
    (code: string, keepInterval = true) => {
      startNavigation("chart", () => {
        router.replace(createSymbolUrl(code, keepInterval), { scroll: false });
      });
    },
    [createSymbolUrl, router, startNavigation]
  );

  const setInterval = useCallback(
    (value: Interval) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("interval", value);
      startNavigation("chart", () => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams, pathname, startNavigation]
  );

  return { symbol, interval, setSymbol, replaceSymbol, setInterval };
}

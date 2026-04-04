"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type Interval = "1day" | "1week" | "1month";

const isInterval = (v: string | null): v is Interval =>
  v === "1day" || v === "1week" || v === "1month";

export function useSelectedSymbol() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const symbol = searchParams.get("symbol") ?? null;
  const rawInterval = searchParams.get("interval");
  const interval: Interval = isInterval(rawInterval) ? rawInterval : "1day";

  const setSymbol = useCallback(
    (code: string, keepInterval = true) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("symbol", code);
      if (!keepInterval) params.set("interval", "1day");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, pathname]
  );

  const setInterval = useCallback(
    (value: Interval) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("interval", value);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, pathname]
  );

  return { symbol, interval, setSymbol, setInterval };
}

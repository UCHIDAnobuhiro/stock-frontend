"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type Interval = "1day" | "1week" | "1month";

export function useSelectedSymbol() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const symbol = searchParams.get("symbol") ?? null;
  const interval = (searchParams.get("interval") as Interval) ?? "1day";

  const setSymbol = useCallback(
    (code: string, keepInterval = true) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("symbol", code);
      if (!keepInterval) params.set("interval", "1day");
      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const setInterval = useCallback(
    (value: Interval) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("interval", value);
      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return { symbol, interval, setSymbol, setInterval };
}

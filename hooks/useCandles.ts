"use client";

import useSWR from "swr";
import apiClient from "@/lib/api";
import type { components } from "@/lib/generated/schema";
import type { Interval } from "./useSelectedSymbol";

export type CandleResponse = components["schemas"]["CandleResponse"];

const INTERVAL_OUTPUTSIZE: Record<Interval, number> = {
  "1day": 200,
  "1week": 200,
  "1month": 200,
};

async function fetchCandles([, code, interval]: [string, string, Interval]): Promise<CandleResponse[]> {
  const { data, error } = await apiClient.GET("/v1/candles/{code}", {
    params: {
      path: { code },
      query: { interval, outputsize: INTERVAL_OUTPUTSIZE[interval] },
    },
  });
  if (error) throw new Error("チャートデータの取得に失敗しました");
  return data ?? [];
}

export function useCandles(code: string | null, interval: Interval) {
  const key = code ? ["/v1/candles", code, interval] as [string, string, Interval] : null;

  const { data, isLoading, error } = useSWR(key, fetchCandles, {
    revalidateOnFocus: false,
  });

  return {
    candles: data ?? [],
    isLoading,
    error,
  };
}

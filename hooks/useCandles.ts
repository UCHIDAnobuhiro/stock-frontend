"use client";

import useSWR from "swr";
import apiClient from "@/lib/api";
import type { components } from "@/lib/generated/schema";
import type { Interval } from "./useSelectedSymbol";

export type CandleResponse = components["schemas"]["CandleResponse"];

/** 各インターバルで取得するローソク足の本数（全区間共通で 200 本） */
const INTERVAL_OUTPUTSIZE: Record<Interval, number> = {
  "1day": 200,
  "1week": 200,
  "1month": 200,
};

/**
 * SWR のフェッチャー関数。
 * `/v1/candles/{code}` にリクエストし、ローソク足データの配列を返す。
 * タプルの第 0 要素は SWR キャッシュキーのプレフィックスなので無視する。
 */
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

/**
 * 指定した銘柄・インターバルのローソク足データを取得するフック。
 * `code` が null の場合はフェッチを行わず、空配列を返す。
 */
export function useCandles(code: string | null, interval: Interval) {
  // code が null のとき key を null にして SWR のフェッチを無効化する
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

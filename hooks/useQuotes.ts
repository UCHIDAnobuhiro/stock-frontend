"use client";

import useSWR from "swr";
import apiClient, { createApiError } from "@/lib/api";
import type { components } from "@/lib/generated/schema";
import type { Interval } from "./useSelectedSymbol";

export type QuoteResponse = components["schemas"]["QuoteResponse"];

interface UseQuotesOptions {
  /** 時間間隔（省略時は "1day"） */
  interval?: Interval;
  /** スパークライン用に含める直近終値の本数（省略時は 0 件） */
  bars?: number;
}

type QuotesKey = [string, string, Interval, number];

/**
 * SWR のフェッチャー関数。
 * `/v1/quotes` にリクエストし、複数銘柄分の株価サマリー配列を返す。
 * タプルの第 0 要素は SWR キャッシュキーのプレフィックスなので無視する。
 */
async function fetchQuotes([, codes, interval, bars]: QuotesKey): Promise<QuoteResponse[]> {
  const { data, error, response } = await apiClient.GET("/v1/quotes", {
    params: {
      query: { codes, interval, bars },
    },
  });
  if (error) throw createApiError(response.status, "株価サマリーの取得に失敗しました");
  return data ?? [];
}

/**
 * 複数銘柄の株価サマリー（最新終値・前日比・スパークライン用終値）を一括取得するフック。
 * ウォッチリストの表示で銘柄ごとに `/v1/candles/{code}` を呼ぶ N+1 リクエストを避けるため、
 * `/v1/quotes` にまとめてリクエストする。
 *
 * `codes` が空のときは SWR キーを null にしてフェッチを無効化する。
 * SWR キーは codes をソートしてから構築するため、並び替え操作（順序の変化のみ）では再フェッチされない。
 * `keepPreviousData: true` により、銘柄の追加・削除で codes（＝SWRキー）が変わった際も、
 * 新しいデータの取得が完了するまで直前のデータを表示し続ける（値が一瞬空になるちらつきを防ぐ）。
 */
export function useQuotes(codes: string[], options: UseQuotesOptions = {}) {
  const { interval = "1day", bars = 0 } = options;

  // 並び順に依存しないよう codes をソートしてキーを構築する
  const sortedCodes = [...codes].sort();
  const key: QuotesKey | null =
    sortedCodes.length > 0 ? ["/v1/quotes", sortedCodes.join(","), interval, bars] : null;

  const { data, isLoading, error } = useSWR(key, fetchQuotes, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const quotes = new Map((data ?? []).map((quote) => [quote.code, quote]));

  return {
    quotes,
    isLoading,
    error,
  };
}

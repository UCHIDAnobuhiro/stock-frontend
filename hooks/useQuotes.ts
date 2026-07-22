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

/** `/v1/quotes` の `codes` に一度に指定できる銘柄数の上限（API仕様上の最大値） */
const MAX_CODES_PER_REQUEST = 50;

/** 配列を指定サイズごとのチャンクに分割する */
function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * SWR のフェッチャー関数。
 * `/v1/quotes` にリクエストし、複数銘柄分の株価サマリー配列を返す。
 * タプルの第 0 要素は SWR キャッシュキーのプレフィックスなので無視する。
 *
 * `codes` は API 仕様上 1 リクエストあたり最大 {@link MAX_CODES_PER_REQUEST} 件までのため、
 * 51 件以上のときはチャンクに分割して並列リクエストし、結果をマージして返す。
 * いずれかのチャンクが失敗した場合はそのエラーを throw する。
 */
async function fetchQuotes([, codes, interval, bars]: QuotesKey): Promise<QuoteResponse[]> {
  const codeChunks = chunk(codes.split(","), MAX_CODES_PER_REQUEST);

  const results = await Promise.all(
    codeChunks.map(async (codesChunk) => {
      const { data, error, response } = await apiClient.GET("/v1/quotes", {
        params: {
          query: { codes: codesChunk.join(","), interval, bars },
        },
      });
      if (error) throw createApiError(response.status, "株価サマリーの取得に失敗しました");
      return data ?? [];
    })
  );

  return results.flat();
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

"use client";

import useSWR from "swr";
import apiClient from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type WatchlistItem = components["schemas"]["WatchlistItem"];

/**
 * SWR のフェッチャー関数。
 * `/v1/watchlist` にリクエストし、ウォッチリストの項目一覧を返す。
 */
async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const { data, error } = await apiClient.GET("/v1/watchlist");
  if (error) throw new Error("ウォッチリストの取得に失敗しました");
  return data ?? [];
}

/**
 * ウォッチリストの取得・追加・削除・並び替えを管理するフック。
 * 各ミューテーションはオプティミスティック更新を使用し、
 * エラー時は自動的に前の状態へロールバックする。
 */
export function useWatchlist() {
  const { data, isLoading, error, mutate } = useSWR("/v1/watchlist", fetchWatchlist);

  /**
   * 銘柄をウォッチリストに追加する。
   * 一時 ID と末尾 sort_key を持つアイテムをオプティミスティックに追加し、
   * API 確定後にサーバー側の正式データで上書きする。
   */
  const addSymbol = async (symbolCode: string) => {
    const optimistic = [
      ...(data ?? []),
      { id: Date.now(), symbol_code: symbolCode, sort_key: (data?.length ?? 0) + 1 },
    ];
    await mutate(
      async () => {
        const { error } = await apiClient.POST("/v1/watchlist", {
          body: { symbol_code: symbolCode },
        });
        if (error) throw new Error("銘柄の追加に失敗しました");
        return fetchWatchlist();
      },
      { optimisticData: optimistic, rollbackOnError: true }
    );
  };

  /**
   * 指定した銘柄をウォッチリストから削除する。
   * オプティミスティックに該当アイテムをフィルタリングし、
   * API 確定後にサーバー側の正式データで上書きする。
   */
  const removeSymbol = async (code: string) => {
    const optimistic = (data ?? []).filter((item) => item.symbol_code !== code);
    await mutate(
      async () => {
        const { error } = await apiClient.DELETE("/v1/watchlist/{code}", {
          params: { path: { code } },
        });
        if (error) throw new Error("銘柄の削除に失敗しました");
        return fetchWatchlist();
      },
      { optimisticData: optimistic, rollbackOnError: true }
    );
  };

  /**
   * ウォッチリストの並び順を更新する。
   * `codes` の順序に従い sort_key を 1 始まりで振り直す。
   * オプティミスティックに並び替えを反映し、API 確定後に正式データで上書きする。
   */
  const reorder = async (codes: string[]) => {
    const currentData = data ?? [];
    const optimistic = codes.map((code, index) => {
      const item = currentData.find((i) => i.symbol_code === code);
      return { ...(item ?? { id: index, symbol_code: code }), sort_key: index + 1 };
    });
    await mutate(
      async () => {
        const { error } = await apiClient.PUT("/v1/watchlist/order", {
          body: { codes },
        });
        if (error) throw new Error("並び替えに失敗しました");
        return fetchWatchlist();
      },
      { optimisticData: optimistic, rollbackOnError: true }
    );
  };

  return {
    items: data ?? [],
    isLoading,
    error,
    addSymbol,
    removeSymbol,
    reorder,
  };
}

"use client";

import useSWR from "swr";
import apiClient from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type WatchlistItem = components["schemas"]["WatchlistItem"];

async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const { data, error } = await apiClient.GET("/v1/watchlist");
  if (error) throw new Error("ウォッチリストの取得に失敗しました");
  return data ?? [];
}

export function useWatchlist() {
  const { data, isLoading, error, mutate } = useSWR("/v1/watchlist", fetchWatchlist);

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

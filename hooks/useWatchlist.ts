"use client";

import useSWR from "swr";
import apiClient, { createApiError } from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type WatchlistItem = components["schemas"]["WatchlistItem"];

/**
 * SWR のフェッチャー関数。
 * `/v1/watchlist` にリクエストし、ウォッチリストの項目一覧を返す。
 */
async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const { data, error, response } = await apiClient.GET("/v1/watchlist");
  if (error) throw createApiError(response.status, "ウォッチリストの取得に失敗しました");
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
   * optimisticData はコールバック形式で渡し、mutate 実行時点の最新キャッシュを
   * 土台に計算する（連続操作時の stale closure を回避するため）。
   */
  const addSymbol = async (symbolCode: string) => {
    await mutate(
      async () => {
        const { error, response } = await apiClient.POST("/v1/watchlist", {
          body: { symbol_code: symbolCode },
        });
        if (error) throw createApiError(response.status, "銘柄の追加に失敗しました");
        return fetchWatchlist();
      },
      {
        optimisticData: (current?: WatchlistItem[]) => [
          ...(current ?? []),
          { id: Date.now(), symbol_code: symbolCode, sort_key: (current?.length ?? 0) + 1 },
        ],
        rollbackOnError: true,
      }
    );
  };

  /**
   * 指定した銘柄をウォッチリストから削除する。
   * オプティミスティックに該当アイテムをフィルタリングし、
   * API 確定後にサーバー側の正式データで上書きする。
   * optimisticData はコールバック形式で渡し、mutate 実行時点の最新キャッシュを
   * 土台に計算する（連続操作時の stale closure を回避するため）。
   */
  const removeSymbol = async (code: string) => {
    await mutate(
      async () => {
        const { error, response } = await apiClient.DELETE("/v1/watchlist/{code}", {
          params: { path: { code } },
        });
        if (error) throw createApiError(response.status, "銘柄の削除に失敗しました");
        return fetchWatchlist();
      },
      {
        optimisticData: (current?: WatchlistItem[]) =>
          (current ?? []).filter((item) => item.symbol_code !== code),
        rollbackOnError: true,
      }
    );
  };

  /**
   * ウォッチリストの並び順を更新する。
   * `codes` の順序に従い sort_key を 1 始まりで振り直す。
   * オプティミスティックに並び替えを反映し、API 確定後に正式データで上書きする。
   * optimisticData はコールバック形式で渡し、mutate 実行時点の最新キャッシュを
   * 土台に計算する（連続操作時の stale closure を回避するため）。
   * 現在のキャッシュに存在しないコードは架空アイテムを作らず除外する。
   */
  const reorder = async (codes: string[]) => {
    await mutate(
      async () => {
        const { error, response } = await apiClient.PUT("/v1/watchlist/order", {
          body: { codes },
        });
        if (error) throw createApiError(response.status, "並び替えに失敗しました");
        return fetchWatchlist();
      },
      {
        optimisticData: (current?: WatchlistItem[]) => {
          const byCode = new Map((current ?? []).map((item) => [item.symbol_code, item]));
          return codes
            .map((code) => byCode.get(code))
            .filter((item): item is WatchlistItem => item !== undefined)
            .map((item, index) => ({ ...item, sort_key: index + 1 }));
        },
        rollbackOnError: true,
      }
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

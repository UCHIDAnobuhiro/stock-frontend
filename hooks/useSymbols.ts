"use client";

import useSWR from "swr";
import apiClient from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type SymbolItem = components["schemas"]["SymbolItem"];

/**
 * SWR のフェッチャー関数。
 * `/v1/symbols` にリクエストし、アクティブな銘柄一覧を返す。
 */
async function fetchSymbols(): Promise<SymbolItem[]> {
  const { data, error } = await apiClient.GET("/v1/symbols");
  if (error) throw new Error("銘柄一覧の取得に失敗しました");
  return data ?? [];
}

/**
 * アクティブな銘柄一覧を取得するフック。
 * データはウィンドウフォーカス時に再取得しない。
 */
export function useSymbols() {
  const { data, isLoading, error } = useSWR("/v1/symbols", fetchSymbols, {
    revalidateOnFocus: false,
  });

  return {
    symbols: data ?? [],
    isLoading,
    error,
  };
}

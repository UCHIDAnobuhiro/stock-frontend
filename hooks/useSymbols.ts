"use client";

import useSWR from "swr";
import apiClient from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type SymbolItem = components["schemas"]["SymbolItem"];

async function fetchSymbols(): Promise<SymbolItem[]> {
  const { data, error } = await apiClient.GET("/v1/symbols");
  if (error) throw new Error("銘柄一覧の取得に失敗しました");
  return data ?? [];
}

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

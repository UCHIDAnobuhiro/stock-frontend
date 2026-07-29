"use client";

import { useEffect } from "react";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { useWatchlist } from "@/hooks/useWatchlist";

/**
 * URL に銘柄が指定されていない場合、ウォッチリストの先頭銘柄を初期選択する。
 *
 * 既存の URL 指定はウォッチリストに含まれていなくても尊重する。
 * 自動選択は履歴を増やさないよう replace で反映する。
 */
export function useDefaultWatchlistSymbol() {
  const { symbol, replaceSymbol } = useSelectedSymbol();
  const { items, isLoading, error } = useWatchlist();
  const defaultSymbol = items[0]?.symbol_code;

  useEffect(() => {
    if (!symbol && !isLoading && !error && defaultSymbol) {
      replaceSymbol(defaultSymbol);
    }
  }, [defaultSymbol, error, isLoading, replaceSymbol, symbol]);

  return {
    isInitializing: !symbol && (isLoading || (!error && Boolean(defaultSymbol))),
  };
}

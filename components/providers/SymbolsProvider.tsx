"use client";

import { createContext, use, useContext, type ReactNode } from "react";
import { SWRConfig } from "swr";
import type { SymbolItem } from "@/lib/market-data";

const SymbolsPromiseContext = createContext<Promise<SymbolItem[] | null> | null>(null);

/** 一覧取得を開始したまま、依存する表示だけに結果を渡す。 */
export function SymbolsProvider({
  promise,
  children,
}: {
  promise: Promise<SymbolItem[] | null>;
  children: ReactNode;
}) {
  return (
    <SymbolsPromiseContext.Provider value={promise}>
      {children}
    </SymbolsPromiseContext.Provider>
  );
}

/** 呼び出し側で Suspense に包み、シェルやチャートの取得は待たせない。 */
export function SymbolsFallback({ children }: { children: ReactNode }) {
  const promise = useContext(SymbolsPromiseContext);
  // 単体利用時は通常の SWR 取得へ進める。
  if (!promise) return children;

  const symbols = use(promise);
  const fallback = symbols === null ? {} : { "/v1/symbols": symbols };

  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}

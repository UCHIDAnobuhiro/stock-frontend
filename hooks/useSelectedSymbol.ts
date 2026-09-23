"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { isInterval, type Interval } from "@/lib/market-data";

export type { Interval } from "@/lib/market-data";

function chartUrl(params: URLSearchParams) {
  return `${window.location.pathname}?${params.toString()}`;
}

function symbolUrl(code: string, keepInterval: boolean) {
  // 連続操作で useSearchParams の再レンダー前でも最新の URL を使う。
  const params = new URLSearchParams(window.location.search);
  params.set("symbol", code);
  if (!keepInterval) params.set("interval", "1day");
  return chartUrl(params);
}

export function useSelectedSymbol() {
  const searchParams = useSearchParams();

  const rawSymbol = searchParams.get("symbol");
  const symbol = rawSymbol?.trim() || null;
  const rawInterval = searchParams.get("interval");
  const interval: Interval = isInterval(rawInterval) ? rawInterval : "1day";

  // 同一ページのクエリ変更では Server Component を再実行せず、
  // Next.js と同期する History API で URL と戻る・進む履歴を更新する。
  const setSymbol = useCallback(
    (code: string, keepInterval = true) => {
      window.history.pushState(null, "", symbolUrl(code, keepInterval));
    },
    []
  );

  const replaceSymbol = useCallback(
    (code: string, keepInterval = true) => {
      window.history.replaceState(null, "", symbolUrl(code, keepInterval));
    },
    []
  );

  const setInterval = useCallback(
    (value: Interval) => {
      const params = new URLSearchParams(window.location.search);
      params.set("interval", value);
      window.history.pushState(null, "", chartUrl(params));
    },
    []
  );

  return { symbol, interval, setSymbol, replaceSymbol, setInterval };
}

"use client";

import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useCallback, useRef } from "react";
import { isInterval, type Interval } from "@/lib/market-data";

export type { Interval } from "@/lib/market-data";

function chartUrl(params: URLSearchParams, current: URL) {
  return `${current.pathname}?${params.toString()}${current.hash}`;
}

function symbolUrl(code: string, keepInterval: boolean, current: URL) {
  const params = new URLSearchParams(current.search);
  params.set("symbol", code);
  if (!keepInterval) params.set("interval", "1day");
  return chartUrl(params, current);
}

export function useSelectedSymbol() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const latestUrl = useRef(new URL(location.pathname + location.search + location.hash, "http://localhost"));
  const locationUrl = location.pathname + location.search + location.hash;
  if (latestUrl.current.pathname + latestUrl.current.search + latestUrl.current.hash !== locationUrl) {
    latestUrl.current = new URL(locationUrl, "http://localhost");
  }

  const rawSymbol = searchParams.get("symbol");
  const symbol = rawSymbol?.trim() || null;
  const rawInterval = searchParams.get("interval");
  const interval: Interval = isInterval(rawInterval) ? rawInterval : "1day";

  // 最新URLを基に更新し、連続操作で他のクエリを失わない。
  const setSymbol = useCallback(
    (code: string, keepInterval = true) => {
      const url = symbolUrl(code, keepInterval, latestUrl.current);
      latestUrl.current = new URL(url, "http://localhost");
      void navigate(url);
    },
    [navigate]
  );

  const replaceSymbol = useCallback(
    (code: string, keepInterval = true) => {
      const url = symbolUrl(code, keepInterval, latestUrl.current);
      latestUrl.current = new URL(url, "http://localhost");
      void navigate(url, { replace: true });
    },
    [navigate]
  );

  const setInterval = useCallback(
    (value: Interval) => {
      const params = new URLSearchParams(latestUrl.current.search);
      params.set("interval", value);
      const url = chartUrl(params, latestUrl.current);
      latestUrl.current = new URL(url, "http://localhost");
      void navigate(url);
    },
    [navigate]
  );

  return { symbol, interval, setSymbol, replaceSymbol, setInterval };
}

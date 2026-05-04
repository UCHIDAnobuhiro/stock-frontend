"use client";

import { useId } from "react";
import { useCandles } from "@/hooks/useCandles";

export function WatchlistSparkline({ code }: { code: string }) {
  const gradientId = `spark${useId().replace(/:/g, "")}`;
  const { candles, isLoading } = useCandles(code, "1day");

  if (isLoading) {
    return (
      <div
        className="h-9 w-full rounded animate-pulse"
        style={{ backgroundColor: "var(--color-surface-3)" }}
      />
    );
  }

  const visibleCount = window.innerWidth < 640 ? 30 : 60;
  const slice = [...candles].sort((a, b) => (a.time < b.time ? -1 : 1)).slice(-visibleCount);
  if (slice.length < 2) return <div className="h-9 w-full" />;

  const closes = slice.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const W = 100;
  const H = 36;
  const pad = 1;

  const points = closes.map((v, i) => ({
    x: pad + (i / (closes.length - 1)) * (W - pad * 2),
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(" ");
  const areaPath = `${linePath} L${points.at(-1)!.x},${H} L${points[0].x},${H} Z`;
  const isUp = closes.at(-1)! >= closes[0];
  const color = isUp ? "var(--color-bull)" : "var(--color-bear)";

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

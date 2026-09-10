"use client";

import { useSelectedSymbol, type Interval } from "@/hooks/useSelectedSymbol";
import { IndicatorToolbar } from "./IndicatorToolbar";

const INTERVAL_LABELS: Record<Interval, string> = {
  "1day": "日足",
  "1week": "週足",
  "1month": "月足",
};

interface ChartDisplayControlsProps {
  smaEnabled: boolean;
  toggleSma: () => void;
  bollingerEnabled: boolean;
  toggleBollinger: () => void;
  isPending: boolean;
}

export function ChartDisplayControls({ isPending, ...indicators }: ChartDisplayControlsProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-5 sm:px-6 sm:pb-6 lg:col-start-1 lg:row-start-2 lg:justify-start lg:gap-2 lg:pt-3 lg:pb-4" aria-label="チャートの表示設定">
      <ChartIntervalControls isPending={isPending} />
      <IndicatorToolbar {...indicators} />
    </div>
  );
}

export function ChartIntervalControls({ isPending, compact = false }: { isPending: boolean; compact?: boolean }) {
  const { interval, setInterval } = useSelectedSymbol();
  return (
      <div role="group" aria-label="時間足" className={`flex shrink-0 rounded-xl bg-[var(--color-surface-3)] ${compact ? "p-0.5" : "p-1"}`}>
        {(Object.entries(INTERVAL_LABELS) as [Interval, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={interval === value}
            disabled={isPending}
            onClick={() => { if (value !== interval) setInterval(value); }}
            className={`rounded-lg font-medium transition-colors disabled:cursor-wait ${compact ? "h-8 px-1.5 text-xs" : "min-h-11 px-4 text-sm lg:px-3"}`}
            style={{
              backgroundColor: value === interval ? "var(--color-surface-1)" : "transparent",
              color: value === interval ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              boxShadow: value === interval ? "0 1px 4px #00000012" : undefined,
            }}
          >
            {label}
          </button>
        ))}
      </div>
  );
}

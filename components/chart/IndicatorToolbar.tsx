"use client";

import { SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverTitle } from "@/components/ui/popover";

interface IndicatorToolbarProps {
  smaEnabled: boolean;
  toggleSma: () => void;
  bollingerEnabled: boolean;
  toggleBollinger: () => void;
}

export function IndicatorToolbar({ smaEnabled, toggleSma, bollingerEnabled, toggleBollinger }: IndicatorToolbarProps) {
  const activeCount = Number(smaEnabled) + Number(bollingerEnabled);
  return (
    <Popover>
      <PopoverTrigger className="chart-action" aria-label="インジケーター">
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        <span>指標</span>
        {activeCount > 0 && <span className="rounded-full bg-[var(--color-accent-dim)] px-1.5 text-xs text-[var(--color-accent)]">{activeCount}</span>}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-64 max-w-[calc(100vw-2rem)] rounded-2xl p-4">
        <PopoverTitle>テクニカル指標</PopoverTitle>
        {([
          ["移動平均線（SMA）", smaEnabled, toggleSma],
          ["ボリンジャーバンド（BB）", bollingerEnabled, toggleBollinger],
        ] as const).map(([label, enabled, toggle]) => (
          <label key={label} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl px-2 hover:bg-[var(--color-surface-3)]">
            <span className="text-sm">{label}</span>
            <input type="checkbox" checked={enabled} onChange={toggle} className="size-5 accent-[var(--color-accent)]" />
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

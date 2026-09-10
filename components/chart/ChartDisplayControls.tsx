"use client";

import { useOptimistic, useRef, useState, useTransition, type CSSProperties } from "react";
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
  const values = Object.keys(INTERVAL_LABELS) as Interval[];
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const pointerId = useRef<number | null>(null);
  const [optimisticInterval, setOptimisticInterval] = useOptimistic(interval);
  const [isSelecting, startTransition] = useTransition();
  const busy = isPending || isSelecting;
  const selectedIndex = values.indexOf(optimisticInterval);
  const position = busy ? selectedIndex : dragPosition ?? selectedIndex;
  const select = (index: number) => {
    if (busy || values[index] === interval) return;
    // Keep the released segment selected while the URL transition is pending.
    // React restores the actual interval if navigation does not commit.
    startTransition(() => {
      setOptimisticInterval(values[index]);
      setInterval(values[index]);
    });
  };
  const positionAt = (element: HTMLDivElement, clientX: number) => {
    const rect = element.getBoundingClientRect();
    const segmentWidth = (rect.width - 8) / values.length;
    return Math.max(0, Math.min(values.length - 1, (clientX - rect.left - 4) / segmentWidth - 0.5));
  };
  const cancelDrag = () => {
    pointerId.current = null;
    setDragPosition(null);
  };

  return (
    <div
      role="group"
      aria-label="時間足"
      aria-busy={busy}
      className={`chart-interval-control ${compact ? "chart-interval-control-compact" : ""}`}
      data-dragging={!busy && dragPosition !== null}
      style={{ "--interval-position": position } as CSSProperties}
      onPointerDown={(event) => {
        if (busy || !event.isPrimary || event.button !== 0 || pointerId.current !== null) return;
        pointerId.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragPosition(positionAt(event.currentTarget, event.clientX));
      }}
      onPointerMove={(event) => {
        if (pointerId.current !== event.pointerId || busy) return;
        setDragPosition(positionAt(event.currentTarget, event.clientX));
      }}
      onPointerUp={(event) => {
        if (pointerId.current !== event.pointerId) return;
        select(Math.round(positionAt(event.currentTarget, event.clientX)));
        cancelDrag();
      }}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={cancelDrag}
    >
      <span aria-hidden="true" className="chart-interval-glass" />
      {values.map((value, index) => (
        <button
          key={value}
          type="button"
          aria-pressed={optimisticInterval === value}
          disabled={busy}
          // Pointer selection is committed on release, including after dragging.
          // Keyboard and assistive-technology clicks still use the native button.
          onClick={(event) => { if (event.detail === 0) select(index); }}
          className="chart-interval-option"
          data-highlighted={Math.round(position) === index}
        >
          {INTERVAL_LABELS[value]}
        </button>
      ))}
    </div>
  );
}

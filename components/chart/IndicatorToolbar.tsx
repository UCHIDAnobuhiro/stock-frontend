"use client";

import { useRef, useState, useEffect } from "react";
import { BOLLINGER_COLORS } from "@/lib/indicators";

const SMA_COLORS = ["#2962ff", "#ff6d00", "#ab47bc"] as const;

function ToggleSwitch({ checked, color }: { checked: boolean; color: string }) {
  return (
    <div
      aria-hidden="true"
      className="relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full transition-colors duration-200"
      style={{ backgroundColor: checked ? color : "var(--color-surface-3)" }}
    >
      <span
        className="inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: checked ? "translateX(13px)" : "translateX(2px)" }}
      />
    </div>
  );
}

interface IndicatorToolbarProps {
  smaEnabled: boolean;
  toggleSma: () => void;
  bollingerEnabled: boolean;
  toggleBollinger: () => void;
}

export function IndicatorToolbar({ smaEnabled, toggleSma, bollingerEnabled, toggleBollinger }: IndicatorToolbarProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCount = (smaEnabled ? 1 : 0) + (bollingerEnabled ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
        style={{
          backgroundColor: open ? "var(--color-surface-3)" : "transparent",
          color: "var(--color-text-secondary)",
        }}
      >
        インジケーター
        {activeCount > 0 && (
          <span
            className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            {activeCount}
          </span>
        )}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        >
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border shadow-xl"
          style={{ backgroundColor: "var(--color-surface-2)", borderColor: "var(--color-border)" }}
        >
          <div className="border-b px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              テクニカル指標
            </p>
          </div>

          <div className="p-1">
            <button
              onClick={toggleSma}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-3)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-0.5">
                  {SMA_COLORS.map((color) => (
                    <span key={color} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>SMA</div>
                  <div className="text-[10px] leading-tight" style={{ color: "var(--color-text-muted)" }}>移動平均線</div>
                </div>
              </div>
              <ToggleSwitch checked={smaEnabled} color={SMA_COLORS[0]} />
            </button>

            <button
              onClick={toggleBollinger}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-3)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="h-px w-5 rounded" style={{ backgroundColor: BOLLINGER_COLORS.sigma2 }} />
                  <div className="h-px w-3.5 rounded" style={{ backgroundColor: BOLLINGER_COLORS.middle }} />
                  <div className="h-px w-5 rounded" style={{ backgroundColor: BOLLINGER_COLORS.sigma2 }} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>BB</div>
                  <div className="text-[10px] leading-tight" style={{ color: "var(--color-text-muted)" }}>ボリンジャーバンド</div>
                </div>
              </div>
              <ToggleSwitch checked={bollingerEnabled} color={BOLLINGER_COLORS.sigma3} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";

interface IndicatorToolbarProps {
  smaEnabled: boolean;
  toggleSma: () => void;
}

export function IndicatorToolbar({ smaEnabled, toggleSma }: IndicatorToolbarProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
        style={{
          backgroundColor: open ? "var(--color-surface-3)" : "transparent",
          color: "var(--color-text-secondary)",
        }}
      >
        指標
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 rounded-md border p-3 shadow-lg"
          style={{
            backgroundColor: "var(--color-surface-2)",
            borderColor: "var(--color-border)",
          }}
        >
          <label
            className="flex cursor-pointer items-center gap-2 text-xs select-none"
            style={{ color: "var(--color-text-primary)" }}
          >
            <input
              type="checkbox"
              checked={smaEnabled}
              onChange={toggleSma}
              className="h-3.5 w-3.5 cursor-pointer rounded"
            />
            SMA
          </label>
        </div>
      )}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { useSelectedSymbol, type Interval } from "@/hooks/useSelectedSymbol";
import { useSymbols } from "@/hooks/useSymbols";

const INTERVALS: { value: Interval; label: string }[] = [
  { value: "1day", label: "日足" },
  { value: "1week", label: "週足" },
  { value: "1month", label: "月足" },
];

export function ChartToolbar() {
  const { symbol, interval, setInterval } = useSelectedSymbol();
  const { symbols } = useSymbols();
  const selectedSymbol = symbols.find((s) => s.code === symbol);

  return (
    <div
      className="flex h-10 shrink-0 items-center gap-3 border-b px-4"
      style={{
        backgroundColor: "var(--color-surface-2)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* 銘柄名 */}
      <div className="flex items-center gap-2 min-w-0">
        {selectedSymbol ? (
          <>
            <span
              className="text-sm font-semibold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {selectedSymbol.code}
            </span>
            <span
              className="text-xs truncate hidden sm:block"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {selectedSymbol.name}
            </span>
          </>
        ) : (
          <span
            className="text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            銘柄未選択
          </span>
        )}
      </div>

      {/* 足種ボタン（右寄せ、横スクロール対応） */}
      <div className="ml-auto flex items-center gap-1 overflow-x-auto shrink-0">
        {INTERVALS.map((item) => (
          <button
            key={item.value}
            onClick={() => setInterval(item.value)}
            className={cn(
              "whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors",
              interval === item.value
                ? "text-white"
                : "hover:opacity-80"
            )}
            style={
              interval === item.value
                ? {
                    backgroundColor: "var(--color-accent)",
                    color: "#ffffff",
                  }
                : {
                    backgroundColor: "transparent",
                    color: "var(--color-text-secondary)",
                  }
            }
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelectedSymbol, type Interval } from "@/hooks/useSelectedSymbol";
import { useSymbols } from "@/hooks/useSymbols";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useQuotes } from "@/hooks/useQuotes";
import { IndicatorToolbar } from "./IndicatorToolbar";
import { SymbolLogo } from "@/components/ui/SymbolLogo";

const INTERVALS: { value: Interval; label: string }[] = [
  { value: "1day", label: "日足" },
  { value: "1week", label: "週足" },
  { value: "1month", label: "月足" },
];

interface ChartToolbarProps {
  smaEnabled: boolean;
  toggleSma: () => void;
  bollingerEnabled: boolean;
  toggleBollinger: () => void;
}

export function ChartToolbar({ smaEnabled, toggleSma, bollingerEnabled, toggleBollinger }: ChartToolbarProps) {
  const { symbol, interval, setInterval } = useSelectedSymbol();
  const { symbols } = useSymbols();
  const { items, addSymbol, removeSymbol } = useWatchlist();
  const { quotes } = useQuotes(symbol ? [symbol] : []);
  const priceInfo = symbol ? quotes.get(symbol) : undefined;
  const selectedSymbol = symbols.find((s) => s.code === symbol);
  const isWatched = symbol !== null && items.some((i) => i.symbol_code === symbol);

  return (
    <div
      className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:h-10 sm:gap-3 sm:px-4"
      style={{
        backgroundColor: "var(--color-surface-2)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* 銘柄名 */}
      <div className="flex min-w-0 items-center gap-2">
        {selectedSymbol ? (
          <>
            <SymbolLogo code={selectedSymbol.code} logoUrl={selectedSymbol.logo_url} size={24} />
            <span
              className="shrink-0 whitespace-nowrap text-sm font-semibold"
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
            {priceInfo && (
              <>
                <span
                  className="text-sm font-medium tabular-nums hidden sm:block"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {priceInfo.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className="text-xs font-medium tabular-nums hidden sm:block"
                  style={{ color: priceInfo.change >= 0 ? "var(--color-bull)" : "var(--color-bear)" }}
                >
                  {priceInfo.change >= 0 ? "+" : ""}{priceInfo.change_percent.toFixed(2)}%
                </span>
              </>
            )}
            {symbol && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (isWatched) await removeSymbol(symbol);
                    else await addSymbol(symbol);
                  } catch {
                    // SWR がオプティミスティック更新をロールバックする
                  }
                }}
                aria-label={isWatched ? "ウォッチリストから削除" : "ウォッチリストに追加"}
                className="flex size-11 items-center justify-center rounded transition-colors hover:bg-[var(--color-surface-3)] sm:size-auto sm:p-0.5"
                style={{ color: isWatched ? "var(--color-accent)" : "var(--color-text-muted)" }}
              >
                <Bookmark className="h-3.5 w-3.5" fill={isWatched ? "currentColor" : "none"} />
              </button>
            )}
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

      {/* 右側: 指標ボタン + 足種ボタン */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <IndicatorToolbar
          smaEnabled={smaEnabled}
          toggleSma={toggleSma}
          bollingerEnabled={bollingerEnabled}
          toggleBollinger={toggleBollinger}
        />
        <div
          className="mx-1 h-4 w-px shrink-0"
          style={{ backgroundColor: "var(--color-border)" }}
        />
        <div className="flex items-center gap-1 overflow-x-auto">
          {INTERVALS.map((item) => (
            <button
              key={item.value}
              onClick={() => setInterval(item.value)}
              className={cn(
                "min-h-11 whitespace-nowrap rounded px-2 py-1 text-xs font-medium transition-colors sm:min-h-0 sm:px-2.5",
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
    </div>
  );
}

"use client";

import { useState, type Ref } from "react";
import { Bookmark } from "lucide-react";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { useSymbols } from "@/hooks/useSymbols";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useQuotes } from "@/hooks/useQuotes";
import { SymbolLogo } from "@/components/ui/SymbolLogo";

interface ChartToolbarProps {
  isPending?: boolean;
  readoutRef?: Ref<HTMLDivElement>;
  isLoading?: boolean;
}

export function ChartToolbar({ isPending = false, readoutRef, isLoading: isChartLoading = false }: ChartToolbarProps) {
  const { symbol } = useSelectedSymbol();
  const { symbols } = useSymbols();
  const { items, addSymbol, removeSymbol } = useWatchlist();
  const { quotes, failures, isLoading } = useQuotes(symbol ? [symbol] : []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const quote = symbol ? quotes.get(symbol) : undefined;
  const failure = symbol ? failures.get(symbol) : undefined;
  const selected = symbols.find((s) => s.code === symbol);
  const isWatched = items.some((i) => i.symbol_code === symbol);

  return (
    <section className="grid shrink-0 grid-cols-1 gap-x-6 bg-[var(--color-surface-1)] px-4 pt-5 pb-4 sm:px-6 sm:pt-6 lg:contents" aria-label="銘柄情報と表示設定">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 sm:block lg:col-start-1 lg:row-start-1 lg:px-6 lg:pt-6">
      <div className="contents sm:flex sm:items-start sm:justify-between sm:gap-3">
        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:gap-3">
          {symbol && <SymbolLogo code={symbol} logoUrl={selected?.logo_url} size={32} />}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{symbol ?? "銘柄を選択"}</h1>
            <p className="truncate text-xs text-[var(--color-text-secondary)]" title={selected?.name}>{selected?.name ?? "ウォッチリストからチャートを開く"}</p>
          </div>
        </div>
        {symbol && <button type="button" disabled={isSaving} aria-label={isWatched ? "ウォッチリストから削除" : "ウォッチリストに追加"} aria-pressed={isWatched} className="chart-action col-start-3 row-start-1 size-11 shrink-0 p-0" onClick={async () => {
          setIsSaving(true); setSaveError(null);
          try { if (isWatched) await removeSymbol(symbol); else await addSymbol(symbol); }
          catch { setSaveError("ウォッチリストを更新できませんでした"); }
          finally { setIsSaving(false); }
        }}><Bookmark aria-hidden="true" className="size-4 text-[var(--color-accent)]" fill={isWatched ? "currentColor" : "none"} /></button>}
      </div>
      {symbol && <div className="col-start-2 row-start-1 flex flex-col items-end gap-x-3 tabular-nums sm:mt-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-y-1">
        <span className={`whitespace-nowrap text-2xl font-semibold tracking-tight sm:text-4xl sm:text-[var(--color-text-primary)] ${quote ? quote.change >= 0 ? "text-[var(--color-bull)]" : "text-[var(--color-bear)]" : "text-[var(--color-text-primary)]"}`}>{quote ? quote.close.toLocaleString("ja-JP", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</span>
        {quote && <span className="text-sm font-medium" style={{ color: quote.change >= 0 ? "var(--color-bull)" : "var(--color-bear)" }}>{quote.change >= 0 ? "+" : ""}{quote.change_percent.toFixed(2)}%</span>}
        <span className={quote ? "sr-only" : "text-xs text-[var(--color-text-muted)]"}>{quote ? "最新の日足終値・前日比" : isLoading ? "価格を取得中…" : failure?.reason === "insufficient_data" ? "価格データ不足" : "価格を取得できません"}</span>
      </div>}
      {saveError && <p role="alert" className="col-span-3 mt-2 text-xs text-[var(--color-bear)]">{saveError}</p>}
      </div>
      <div ref={readoutRef} inert={isPending} className="row-start-2 min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:my-6 lg:mr-6 lg:border-l lg:border-[var(--color-border-subtle)] lg:pl-6">
        {isChartLoading && <p className="py-3 text-sm text-[var(--color-text-muted)]">四本値を読み込んでいます…</p>}
      </div>
    </section>
  );
}

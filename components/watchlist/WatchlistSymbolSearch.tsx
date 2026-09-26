"use client";

import { useMemo, useRef, useState } from "react";
import type { SymbolItem } from "@/lib/market-data";
import { searchSymbols } from "@/lib/symbol-search";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const PAGE_SIZE = 50;

interface WatchlistSymbolSearchProps {
  symbols: SymbolItem[];
  isLoading: boolean;
  hasData: boolean;
  onSelect: (code: string) => void;
}

export function WatchlistSymbolSearch({
  symbols,
  isLoading,
  hasData,
  onSelect,
}: WatchlistSymbolSearchProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedValue, setSelectedValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => query ? searchSymbols(symbols, query) : [], [symbols, query]);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = results.slice(start, start + PAGE_SIZE);
  const values = visible.map((symbol) => `${symbol.code} ${symbol.name}`);
  const currentValue = values.includes(selectedValue) ? selectedValue : (values[0] ?? "");

  const clear = () => {
    setQuery("");
    setPage(0);
    setSelectedValue("");
  };

  const changePage = (next: number) => {
    setPage(next);
    setSelectedValue("");
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) clear();
      }}
    >
      <Command
        shouldFilter={false}
        value={currentValue}
        onValueChange={setSelectedValue}
        className="overflow-visible! bg-transparent! rounded-none! p-0! h-full [&_[data-slot=command-input-wrapper]]:p-0 [&_[data-slot=command-input-wrapper]]:h-full [&_[data-slot=input-group]]:h-full! [&_[data-slot=input-group]]:border-0! [&_[data-slot=input-group]]:bg-transparent! [&_[data-slot=input-group]]:rounded-none! [&_[data-slot=input-group]]:shadow-none!"
      >
        <CommandInput
          value={query}
          aria-label="銘柄コード・企業名で検索"
          placeholder="銘柄コード・企業名で検索..."
          className="text-base placeholder:text-xs md:text-sm"
          style={{ color: "var(--color-text-primary)" }}
          onValueChange={(value) => {
            setQuery(value);
            setPage(0);
            setSelectedValue("");
          }}
        />
        {query.length > 0 && (
          <CommandList
            className="absolute top-full left-0 w-full min-w-56 z-50 mt-2 rounded-2xl border shadow-lg"
            style={{
              backgroundColor: "var(--color-surface-2)",
              borderColor: "var(--color-border)",
            }}
          >
            {isLoading && !hasData ? (
              <div className="py-4 text-center text-xs text-[var(--color-text-muted)]">
                読み込み中...
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--color-text-muted)]">
                銘柄が見つかりません
              </div>
            ) : (
              <>
                <CommandGroup>
                  {visible.map((symbol) => (
                    <CommandItem
                      key={symbol.code}
                      value={`${symbol.code} ${symbol.name}`}
                      onSelect={() => {
                        onSelect(symbol.code);
                        clear();
                      }}
                      className="gap-2 text-xs cursor-pointer"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      <span className="font-medium">{symbol.code}</span>
                      <span className="truncate" style={{ color: "var(--color-text-secondary)" }}>
                        {symbol.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <div className="border-t px-2 py-1.5 text-xs text-[var(--color-text-muted)]" style={{ borderColor: "var(--color-border)" }}>
                  <p role="status">
                    全{results.length}件中{start + 1}–{start + visible.length}件を表示
                    {results.length > start + visible.length && `・残り${results.length - start - visible.length}件。さらに絞り込むか、次の候補を表示してください。`}
                  </p>
                  {pageCount > 1 && (
                    <div className="mt-1 flex justify-between gap-2">
                      <button type="button" disabled={currentPage === 0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }} onClick={() => changePage(currentPage - 1)} className="rounded px-2 py-1 disabled:opacity-40">前の候補</button>
                      <button type="button" disabled={currentPage === pageCount - 1} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }} onClick={() => changePage(currentPage + 1)} className="rounded px-2 py-1 disabled:opacity-40">次の候補</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
}

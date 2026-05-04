"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useMemo, useState, useEffect, useRef } from "react";
import { BarChart2, List } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useSymbols } from "@/hooks/useSymbols";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { WatchlistItem } from "./WatchlistItem";
import { WatchlistEmpty } from "./WatchlistEmpty";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface WatchlistPanelProps {
  onItemClick?: () => void;
}

export function WatchlistPanel({ onItemClick }: WatchlistPanelProps) {
  const { items, isLoading, removeSymbol, reorder } = useWatchlist();
  const { symbols, isLoading: symbolsLoading } = useSymbols();
  const { symbol: activeSymbol, setSymbol } = useSelectedSymbol();
  const [viewMode, setViewMode] = useState<"compact" | "chart">("compact");
  const [query, setQuery] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("watchlist-view-mode");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageはクライアントでしか読めないためuseEffectが必要
    if (stored === "chart") setViewMode("chart");
  }, []);

  const toggleViewMode = () => {
    const next = viewMode === "compact" ? "chart" : "compact";
    setViewMode(next);
    localStorage.setItem("watchlist-view-mode", next);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.symbol_code === active.id);
    const newIndex = items.findIndex((i) => i.symbol_code === over.id);
    const newOrder = arrayMove(items, oldIndex, newIndex).map((i) => i.symbol_code);
    reorder(newOrder);
  };

  const symbolMap = useMemo(
    () => new Map(symbols.map((s) => [s.code, s])),
    [symbols]
  );

  const handleSelect = (code: string) => {
    setSymbol(code);
    setQuery("");
    onItemClick?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div
        className="h-10 shrink-0 px-2 flex items-center gap-1 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* インライン検索 */}
        <div
          ref={searchContainerRef}
          className="relative flex-1 min-w-0"
          onBlur={(e) => {
            if (!searchContainerRef.current?.contains(e.relatedTarget as Node)) {
              setQuery("");
            }
          }}
        >
          <Command className="overflow-visible! bg-transparent! rounded-none! p-0! h-full [&_[data-slot=command-input-wrapper]]:p-0 [&_[data-slot=command-input-wrapper]]:h-full [&_[data-slot=input-group]]:h-full! [&_[data-slot=input-group]]:border-0! [&_[data-slot=input-group]]:bg-transparent! [&_[data-slot=input-group]]:rounded-none! [&_[data-slot=input-group]]:shadow-none!">
            <CommandInput
              placeholder="銘柄コード・企業名で検索..."
              className="text-xs"
              style={{ color: "var(--color-text-primary)" }}
              onValueChange={setQuery}
            />
            {query.length > 0 && (
              <CommandList
                className="absolute top-full left-0 w-64 z-50 mt-1 rounded-md border shadow-lg"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                }}
              >
                {symbolsLoading ? (
                  <div
                    className="py-4 text-center text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    読み込み中...
                  </div>
                ) : (
                  <>
                    <CommandEmpty style={{ color: "var(--color-text-muted)" }}>
                      銘柄が見つかりません
                    </CommandEmpty>
                    <CommandGroup>
                      {symbols
                        .map((symbol) => (
                          <CommandItem
                            key={symbol.code}
                            value={`${symbol.code} ${symbol.name}`}
                            onSelect={() => handleSelect(symbol.code)}
                            className="gap-2 text-xs cursor-pointer"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            <span className="font-medium">{symbol.code}</span>
                            <span style={{ color: "var(--color-text-secondary)" }}>
                              {symbol.name}
                            </span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            )}
          </Command>
        </div>

        <button
          type="button"
          onClick={toggleViewMode}
          aria-label={viewMode === "compact" ? "スパークラインを表示" : "コンパクト表示に切り替え"}
          className="shrink-0 rounded p-0.5 hover:bg-[var(--color-surface-3)] transition-colors"
          style={{ color: "var(--color-text-muted)" }}
        >
          {viewMode === "compact" ? (
            <BarChart2 className="h-3.5 w-3.5" />
          ) : (
            <List className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* リスト */}
      <div className="flex-1 overflow-y-auto min-h-0 py-1">
        {isLoading ? (
          <div className="space-y-1 px-3 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 rounded animate-pulse"
                style={{ backgroundColor: "var(--color-surface-3)" }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <WatchlistEmpty />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.symbol_code)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <WatchlistItem
                  key={item.symbol_code}
                  id={item.symbol_code}
                  code={item.symbol_code}
                  name={symbolMap.get(item.symbol_code)?.name ?? item.symbol_code}
                  logoUrl={symbolMap.get(item.symbol_code)?.logo_url ?? null}
                  isActive={item.symbol_code === activeSymbol}
                  onClick={() => {
                    setSymbol(item.symbol_code);
                    onItemClick?.();
                  }}
                  onRemove={() => removeSymbol(item.symbol_code)}
                  viewMode={viewMode}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

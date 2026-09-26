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
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { BarChart2, List } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useSymbols } from "@/hooks/useSymbols";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { useQuotes } from "@/hooks/useQuotes";
import { WatchlistItem } from "./WatchlistItem";
import { WatchlistEmpty } from "./WatchlistEmpty";
import { WatchlistSymbolSearch } from "./WatchlistSymbolSearch";

interface WatchlistPanelProps {
  onItemClick?: () => void;
  onDragStateChange?: (dragging: boolean) => void;
  viewMode: "compact" | "chart";
  onToggleViewMode: () => void;
  listScrollTopRef: RefObject<number>;
}

export function WatchlistPanel({ onItemClick, onDragStateChange, viewMode, onToggleViewMode, listScrollTopRef }: WatchlistPanelProps) {
  const { items, isLoading, removeSymbol, reorder } = useWatchlist();
  const { symbols, isLoading: symbolsLoading, hasData: hasSymbolsData } = useSymbols();
  const { symbol: activeSymbol, setSymbol } = useSelectedSymbol();
  const listRef = useRef<HTMLDivElement>(null);

  // ウォッチリスト内の全銘柄の株価サマリーを1回のリクエストでまとめて取得する（N+1回避）
  // viewMode によらず常に bars: 60 で取得することで、compact ⇄ chart 切替でSWRキーが変わらないようにする
  // （切替のたびの再フェッチ・価格表示の一時消失・chartモード保存ユーザーの初回マウント時2回フェッチを防ぐ）
  const codes = useMemo(() => items.map((i) => i.symbol_code), [items]);
  const { quotes, failures, isLoading: quotesLoading } = useQuotes(codes, { bars: 60 });

  useLayoutEffect(() => {
    if (!isLoading && listRef.current) {
      listRef.current.scrollTop = listScrollTopRef.current;
    }
  }, [isLoading, items.length, listScrollTopRef]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    onDragStateChange?.(false);
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

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div
        className="m-3 flex min-h-11 shrink-0 items-center gap-1 rounded-xl border px-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        <WatchlistSymbolSearch
          symbols={symbols}
          isLoading={symbolsLoading}
          hasData={hasSymbolsData}
          onSelect={(code) => {
            setSymbol(code);
            onItemClick?.();
          }}
        />

        <button
          type="button"
          onClick={onToggleViewMode}
          aria-label={viewMode === "compact" ? "スパークラインを表示" : "コンパクト表示に切り替え"}
          className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-[var(--color-surface-3)] md:mr-0 md:size-auto md:p-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          {viewMode === "compact" ? (
            <BarChart2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
          ) : (
            <List className="h-4 w-4 md:h-3.5 md:w-3.5" />
          )}
        </button>
      </div>

      <p className="px-5 pb-2 text-xs font-medium text-[var(--color-text-muted)]">ウォッチリスト</p>
      {/* リスト */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto min-h-0 pb-3"
        onScroll={(event) => { listScrollTopRef.current = event.currentTarget.scrollTop; }}
      >
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
            onDragStart={() => onDragStateChange?.(true)}
            onDragCancel={() => onDragStateChange?.(false)}
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
                  quote={quotes.get(item.symbol_code)}
                  quoteFailure={failures.get(item.symbol_code)}
                  isQuoteLoading={quotesLoading}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

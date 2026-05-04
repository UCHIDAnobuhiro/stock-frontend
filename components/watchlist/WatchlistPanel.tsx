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
import { useMemo, useState } from "react";
import { BarChart2, List } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useSymbols } from "@/hooks/useSymbols";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { WatchlistItem } from "./WatchlistItem";
import { WatchlistEmpty } from "./WatchlistEmpty";
import { WatchlistAddButton } from "./WatchlistAddButton";
import { Separator } from "@/components/ui/separator";

interface WatchlistPanelProps {
  onItemClick?: () => void;
}

export function WatchlistPanel({ onItemClick }: WatchlistPanelProps) {
  const { items, isLoading, removeSymbol, reorder } = useWatchlist();
  const { symbols } = useSymbols();
  const { symbol: activeSymbol, setSymbol } = useSelectedSymbol();
  const [viewMode, setViewMode] = useState<"compact" | "chart">(() => {
    if (typeof window === "undefined") return "compact";
    const stored = localStorage.getItem("watchlist-view-mode");
    return stored === "chart" ? "chart" : "compact";
  });

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

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div
        className="h-10 shrink-0 px-3 flex items-center justify-between border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-muted)" }}
        >
          ウォッチリスト
        </p>
        <button
          type="button"
          onClick={toggleViewMode}
          aria-label={viewMode === "compact" ? "スパークラインを表示" : "コンパクト表示に切り替え"}
          className="rounded p-0.5 hover:bg-[var(--color-surface-3)] transition-colors"
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

      <Separator style={{ backgroundColor: "var(--color-border)" }} />
      <div className="px-1 py-1">
        <WatchlistAddButton />
      </div>
    </div>
  );
}

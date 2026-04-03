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

  const getSymbolName = (code: string) =>
    symbols.find((s) => s.code === code)?.name ?? code;

  return (
    <div className="flex flex-col">
      {/* ヘッダー */}
      <div className="px-3 pt-3 pb-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-muted)" }}
        >
          ウォッチリスト
        </p>
      </div>
      <Separator style={{ backgroundColor: "var(--color-border)" }} />

      {/* リスト */}
      <div className="py-1">
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
                  name={getSymbolName(item.symbol_code)}
                  isActive={item.symbol_code === activeSymbol}
                  onClick={() => {
                    setSymbol(item.symbol_code);
                    onItemClick?.();
                  }}
                  onRemove={() => removeSymbol(item.symbol_code)}
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

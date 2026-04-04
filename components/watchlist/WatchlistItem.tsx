"use client";

import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface WatchlistItemProps {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
}

export function WatchlistItem({ id, code, name, isActive, onClick, onRemove }: WatchlistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      className={cn(
        "group flex items-center gap-1 px-2 py-2 text-sm cursor-pointer select-none",
        isDragging && "opacity-50 z-50"
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* ドラッグハンドル */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="並び替え"
        className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--color-text-muted)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* アクティブインジケーター */}
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
          isActive ? "opacity-100" : "opacity-0"
        )}
        style={{ backgroundColor: "var(--color-accent)" }}
      />

      {/* 銘柄情報 */}
      <div
        className="flex-1 min-w-0 rounded px-1.5 py-0.5"
        style={{
          backgroundColor: isActive ? "var(--color-surface-3)" : "transparent",
          color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        }}
      >
        <div className="font-medium truncate text-xs">{code}</div>
        <div
          className="truncate text-[10px]"
          style={{ color: "var(--color-text-muted)" }}
        >
          {name}
        </div>
      </div>

      {/* 削除ボタン */}
      <button
        type="button"
        aria-label={`${code} をウォッチリストから削除`}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-[var(--color-surface-3)]"
        style={{ color: "var(--color-text-muted)" }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

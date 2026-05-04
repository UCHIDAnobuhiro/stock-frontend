"use client";

import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { SymbolLogo } from "@/components/ui/SymbolLogo";
import { WatchlistSparkline } from "./WatchlistSparkline";
import { usePriceInfo } from "@/hooks/usePriceInfo";

interface WatchlistItemProps {
  id: string;
  code: string;
  name: string;
  logoUrl?: string | null;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
  viewMode: "compact" | "chart";
}

export function WatchlistItem({ id, code, name, logoUrl, isActive, onClick, onRemove, viewMode }: WatchlistItemProps) {
  const priceInfo = usePriceInfo(code);
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
        "group flex gap-1 px-2 py-2 text-sm cursor-pointer select-none",
        viewMode === "chart" ? "items-start" : "items-center",
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
        className={cn(
          "shrink-0 cursor-grab active:cursor-grabbing transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100",
          viewMode === "chart" ? "self-stretch flex items-center" : "mt-0"
        )}
        style={{ color: "var(--color-text-muted)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* 銘柄情報 */}
      <div
        className={cn(
          "flex flex-1 min-w-0 rounded px-1.5 py-0.5",
          viewMode === "chart" ? "flex-col gap-1" : "items-center gap-1.5"
        )}
        style={{
          backgroundColor: isActive ? "var(--color-surface-3)" : "transparent",
          color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <SymbolLogo code={code} logoUrl={logoUrl} size={20} />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate text-sm">{code}</div>
            <div
              className="truncate text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {name}
            </div>
          </div>
          {priceInfo && (
            <div className="ml-auto text-right shrink-0">
              <div className="text-sm font-medium tabular-nums">
                {priceInfo.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div
                className="text-xs tabular-nums"
                style={{ color: priceInfo.change >= 0 ? "var(--color-bull)" : "var(--color-bear)" }}
              >
                {priceInfo.change >= 0 ? "+" : ""}{priceInfo.changePercent.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
        {viewMode === "chart" && <WatchlistSparkline code={code} />}
      </div>

      {/* 削除ボタン */}
      <button
        type="button"
        aria-label={`${code} をウォッチリストから削除`}
        className={cn(
          "shrink-0 transition-opacity rounded p-0.5 hover:bg-[var(--color-surface-3)] opacity-100 md:opacity-0 md:group-hover:opacity-100",
          viewMode === "chart" ? "self-stretch flex items-center" : ""
        )}
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

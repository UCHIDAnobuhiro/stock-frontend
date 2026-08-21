"use client";

import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { SymbolLogo } from "@/components/ui/SymbolLogo";
import { WatchlistSparkline } from "./WatchlistSparkline";
import type { QuoteFailureResponse, QuoteResponse } from "@/hooks/useQuotes";

interface WatchlistItemProps {
  id: string;
  code: string;
  name: string;
  logoUrl?: string | null;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
  viewMode: "compact" | "chart";
  /** `/v1/quotes` から取得した株価サマリー。未取得時は undefined */
  quote?: QuoteResponse;
  /** `/v1/quotes` が返した銘柄単位の取得失敗。成功時は undefined */
  quoteFailure?: QuoteFailureResponse;
  /** 株価サマリーの取得中かどうか（スパークラインのプレースホルダー表示に使用） */
  isQuoteLoading: boolean;
}

export function WatchlistItem({
  id,
  code,
  name,
  logoUrl,
  isActive,
  onClick,
  onRemove,
  viewMode,
  quote,
  quoteFailure,
  isQuoteLoading,
}: WatchlistItemProps) {
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
          "-ml-2 flex w-10 shrink-0 touch-none cursor-grab items-center justify-center self-stretch transition-opacity opacity-100 active:cursor-grabbing md:ml-0 md:w-auto md:opacity-0 md:group-hover:opacity-100"
        )}
        style={{ color: "var(--color-text-muted)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 md:h-3.5 md:w-3.5" />
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
        <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5">
          <SymbolLogo code={code} logoUrl={logoUrl} size={20} />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate text-sm">{code}</div>
            <div
              className="truncate text-xs"
              style={{ color: "var(--color-text-muted)" }}
              title={name}
            >
              {name}
            </div>
          </div>
          {quote && (
            <div className="justify-self-end whitespace-nowrap text-right">
              <div className="text-sm font-medium tabular-nums">
                {quote.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div
                className="text-xs tabular-nums"
                style={{ color: quote.change >= 0 ? "var(--color-bull)" : "var(--color-bear)" }}
              >
                {quote.change >= 0 ? "+" : ""}{quote.change_percent.toFixed(2)}%
              </div>
            </div>
          )}
          {!quote && quoteFailure && (
            <div
              className="justify-self-end whitespace-nowrap text-right text-xs"
              style={{ color: "var(--color-text-muted)" }}
              title={
                quoteFailure.reason === "insufficient_data"
                  ? "前日比の計算に必要なデータが不足しています"
                  : "株価サマリーを取得できませんでした"
              }
            >
              {quoteFailure.reason === "insufficient_data" ? "データ不足" : "取得失敗"}
            </div>
          )}
        </div>
        {viewMode === "chart" && (
          <WatchlistSparkline closes={quote?.closes ?? []} isLoading={isQuoteLoading} />
        )}
      </div>

      {/* 削除ボタン */}
      <button
        type="button"
        aria-label={`${code} をウォッチリストから削除`}
        className={cn(
          "-mr-2 flex w-10 shrink-0 items-center justify-center self-stretch rounded transition-opacity opacity-100 hover:bg-[var(--color-surface-3)] md:mr-0 md:w-auto md:p-0.5 md:opacity-0 md:group-hover:opacity-100"
        )}
        style={{ color: "var(--color-text-muted)" }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-4 w-4 md:h-3 md:w-3" />
      </button>
    </div>
  );
}

"use client";

import { Suspense } from "react";
import { WatchlistPanel } from "@/components/watchlist/WatchlistPanel";
import { SymbolsFallback } from "@/components/providers/SymbolsProvider";

interface SidebarProps {
  onItemClick?: () => void;
  onDragStateChange?: (dragging: boolean) => void;
}

export default function Sidebar({ onItemClick, onDragStateChange }: SidebarProps) {
  return (
    <aside
      className="flex h-full w-full md:w-72 flex-col md:rounded-3xl md:border"
      style={{
        backgroundColor: "var(--color-surface-1)",
        borderColor: "var(--color-border)",
      }}
    >
      <Suspense fallback={<p className="p-5 text-sm text-[var(--color-text-muted)]">銘柄一覧を読み込んでいます…</p>}>
        <SymbolsFallback>
          <WatchlistPanel onItemClick={onItemClick} onDragStateChange={onDragStateChange} />
        </SymbolsFallback>
      </Suspense>
    </aside>
  );
}

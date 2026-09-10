"use client";

import { WatchlistPanel } from "@/components/watchlist/WatchlistPanel";

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
      <WatchlistPanel onItemClick={onItemClick} onDragStateChange={onDragStateChange} />
    </aside>
  );
}

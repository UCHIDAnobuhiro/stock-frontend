"use client";

import { WatchlistPanel } from "@/components/watchlist/WatchlistPanel";

interface SidebarProps {
  onItemClick?: () => void;
}

export default function Sidebar({ onItemClick }: SidebarProps) {
  return (
    <aside
      className="flex h-full w-full md:w-64 flex-col border-r"
      style={{
        backgroundColor: "var(--color-surface-1)",
        borderColor: "var(--color-border)",
      }}
    >
      <WatchlistPanel onItemClick={onItemClick} />
    </aside>
  );
}

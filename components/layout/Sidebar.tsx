"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { WatchlistPanel } from "@/components/watchlist/WatchlistPanel";

interface SidebarProps {
  onItemClick?: () => void;
}

export default function Sidebar({ onItemClick }: SidebarProps) {
  return (
    <aside
      className="flex h-full w-56 flex-col border-r"
      style={{
        backgroundColor: "var(--color-surface-1)",
        borderColor: "var(--color-border)",
      }}
    >
      <ScrollArea className="flex-1">
        <WatchlistPanel onItemClick={onItemClick} />
      </ScrollArea>
    </aside>
  );
}

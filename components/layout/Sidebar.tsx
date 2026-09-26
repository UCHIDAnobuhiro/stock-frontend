"use client";

import { useEffect, useRef, useState } from "react";
import { WatchlistPanel } from "@/components/watchlist/WatchlistPanel";

interface SidebarProps {
  active?: boolean;
  onItemClick?: () => void;
  onDragStateChange?: (dragging: boolean) => void;
}

export default function Sidebar({ active = true, onItemClick, onDragStateChange }: SidebarProps) {
  const [viewMode, setViewMode] = useState<"compact" | "chart">("compact");
  const listScrollTopRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem("watchlist-view-mode");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageはクライアントでしか読めないためuseEffectが必要
    setViewMode(stored === "chart" ? "chart" : "compact");
  }, [active]);

  const toggleViewMode = () => {
    const next = viewMode === "compact" ? "chart" : "compact";
    setViewMode(next);
    localStorage.setItem("watchlist-view-mode", next);
  };

  return (
    <aside
      className="flex h-full w-full md:w-72 flex-col md:rounded-3xl md:border"
      style={{
        backgroundColor: "var(--color-surface-1)",
        borderColor: "var(--color-border)",
      }}
    >
      {active && (
        <WatchlistPanel
          onItemClick={onItemClick}
          onDragStateChange={onDragStateChange}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          listScrollTopRef={listScrollTopRef}
        />
      )}
    </aside>
  );
}

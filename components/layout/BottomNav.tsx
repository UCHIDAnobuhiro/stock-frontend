"use client";

import { BarChart2, List, ScanSearch } from "lucide-react";

interface BottomNavProps {
  onLogoSearchOpen: () => void;
  onSidebarOpen: () => void;
}

export default function BottomNav({ onLogoSearchOpen, onSidebarOpen }: BottomNavProps) {
  return (
    <nav
      className="flex md:hidden h-14 shrink-0 items-center justify-around border-t"
      style={{
        backgroundColor: "var(--color-surface-1)",
        borderColor: "var(--color-border)",
      }}
    >
      <button
        className="flex flex-col items-center gap-0.5 px-4 py-2 text-xs"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <BarChart2 className="h-5 w-5" />
        <span>チャート</span>
      </button>
      <button
        className="flex flex-col items-center gap-0.5 px-4 py-2 text-xs"
        style={{ color: "var(--color-text-secondary)" }}
        onClick={onSidebarOpen}
      >
        <List className="h-5 w-5" />
        <span>銘柄</span>
      </button>
      <button
        className="flex flex-col items-center gap-0.5 px-4 py-2 text-xs"
        style={{ color: "var(--color-text-secondary)" }}
        onClick={onLogoSearchOpen}
      >
        <ScanSearch className="h-5 w-5" />
        <span>ロゴ検索</span>
      </button>
    </nav>
  );
}

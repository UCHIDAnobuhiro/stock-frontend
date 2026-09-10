"use client";

import { LogOut, PanelLeft, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLogout } from "@/hooks/useLogout";

interface TopbarProps {
  isDesktopSidebarOpen: boolean;
  onDesktopSidebarToggle: () => void;
  onLogoSearchOpen: () => void;
}

export default function Topbar({ onLogoSearchOpen, isDesktopSidebarOpen, onDesktopSidebarToggle }: TopbarProps) {
  const { handleLogout } = useLogout();

  return (
    <header
      className="app-chrome flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:h-16 sm:gap-3 sm:px-6"
      style={{
        borderColor: "var(--color-border)",
      }}
    >
      <Button variant="ghost" size="icon" className="hidden size-11 rounded-xl text-[var(--color-text-secondary)] md:inline-flex aria-expanded:bg-[var(--color-accent-dim)] aria-expanded:text-[var(--color-accent)] aria-expanded:hover:bg-[var(--color-accent-dim)]"
        onClick={onDesktopSidebarToggle}
        aria-label={isDesktopSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
        aria-expanded={isDesktopSidebarOpen} aria-controls="desktop-sidebar"
        title={isDesktopSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}>
        <PanelLeft aria-hidden="true" className="size-5">
          <rect x="3" y="3" width="6" height="18" rx="1" fill="currentColor" stroke="none"
            className="transition-opacity motion-reduce:transition-none" opacity={isDesktopSidebarOpen ? 0.7 : 0} />
        </PanelLeft>
      </Button>

      {/* ロゴ */}
      <span
        className="text-base font-semibold tracking-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        Stock View
      </span>

      {/* 右側アクション */}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          className="hidden h-11 min-w-11 gap-2 rounded-full bg-[var(--color-surface-1)] text-xs md:inline-flex"
          style={{ color: "var(--color-text-secondary)" }}
          onClick={onLogoSearchOpen}
          aria-label="ロゴ検索を開く"
        >
          <ScanSearch className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">ロゴ検索</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-11 min-w-11 gap-2 rounded-full text-xs"
          style={{ color: "var(--color-text-secondary)" }}
          onClick={() => void handleLogout()}
          aria-label="ログアウト"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">ログアウト</span>
        </Button>
      </div>
    </header>
  );
}

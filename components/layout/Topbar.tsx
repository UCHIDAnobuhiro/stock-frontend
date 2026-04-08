"use client";

import { LogOut, Menu, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { useSymbols } from "@/hooks/useSymbols";
import { useLogout } from "@/hooks/useLogout";

interface TopbarProps {
  onLogoSearchOpen: () => void;
  onMobileSidebarOpen: () => void;
}

export default function Topbar({ onLogoSearchOpen, onMobileSidebarOpen }: TopbarProps) {
  const { symbol } = useSelectedSymbol();
  const { symbols } = useSymbols();
  const { handleLogout } = useLogout();
  const selectedSymbol = symbols.find((s) => s.code === symbol);

  return (
    <header
      className="flex h-11 shrink-0 items-center gap-3 border-b px-4"
      style={{
        backgroundColor: "var(--color-surface-1)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* ハンバーガー（モバイルのみ） */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8"
        onClick={onMobileSidebarOpen}
        aria-label="銘柄サイドバーを開く"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* ロゴ */}
      <span
        className="text-sm font-semibold tracking-wide"
        style={{ color: "var(--color-text-primary)" }}
      >
        Stock
      </span>

      {/* 選択中の銘柄 */}
      {selectedSymbol && (
        <div className="flex items-center gap-2 ml-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-accent)" }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {selectedSymbol.code}
          </span>
          <span
            className="text-sm hidden sm:inline"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {selectedSymbol.name}
          </span>
        </div>
      )}

      {/* 右側アクション */}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
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
          className="h-8 gap-1.5 text-xs"
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

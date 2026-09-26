"use client";

import { useRef, useState } from "react";
import { List, ScanSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { useSessionRedirect } from "@/hooks/useSessionRedirect";
import { useIsDesktopSidebar } from "@/hooks/useIsDesktopSidebar";
import { SessionExpiredDialog } from "./SessionExpiredDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSheetSwipe } from "@/hooks/useSheetSwipe";
import { SheetDragHandle } from "@/components/ui/SheetDragHandle";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import { LogoSearchSheet } from "@/components/logo/LogoSearchSheet";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const redirectToLogin = useSessionRedirect();
  const [isLogoSearchOpen, setIsLogoSearchOpen] = useState(false);
  const [hasOpenedLogoSearch, setHasOpenedLogoSearch] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const isDesktopSidebarViewport = useIsDesktopSidebar();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const showDesktopSidebar = isDesktopSidebarViewport && isDesktopSidebarOpen && !isMobileSidebarOpen;
  const sidebarSwipe = useSheetSwipe(() => setIsMobileSidebarOpen(false));
  const sidebarReturnFocusRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const isSidebarDraggingRef = useRef(false);
  const handleLogoSearchOpen = () => {
    setHasOpenedLogoSearch(true);
    setIsLogoSearchOpen(true);
  };
  const handleMobileSidebarOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    sidebarReturnFocusRef.current = event.currentTarget;
    isSidebarDraggingRef.current = false;
    setIsMobileSidebarOpen(true);
  };
  const { isExpired } = useSessionExpiry();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Topbar
        onLogoSearchOpen={handleLogoSearchOpen}
        isDesktopSidebarOpen={isDesktopSidebarOpen}
        onDesktopSidebarToggle={() => setIsDesktopSidebarOpen((open) => !open)}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden md:gap-3 md:p-3">
        {/* PC: 開閉可能なサイドバー */}
        <div id="desktop-sidebar" className={showDesktopSidebar ? "hidden md:flex" : "hidden"}>
          <Sidebar active={showDesktopSidebar} />
        </div>
        {/* メインエリア */}
        <main ref={mainRef} tabIndex={-1} className="flex min-w-0 flex-1 flex-col overflow-y-auto md:rounded-3xl md:border md:border-[var(--color-border)]">{children}</main>
      </div>
      <nav aria-label="銘柄とロゴの検索" className="app-chrome shrink-0 border-t border-[var(--color-border)] px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" className="h-12 gap-2 rounded-xl" onClick={handleMobileSidebarOpen} aria-label="銘柄サイドバーを開く" aria-expanded={isMobileSidebarOpen}>
            <List className="size-5" aria-hidden="true" />銘柄一覧
          </Button>
          <Button variant="ghost" className="h-12 gap-2 rounded-xl" onClick={handleLogoSearchOpen} aria-label="ロゴ検索を開く" aria-expanded={isLogoSearchOpen}>
            <ScanSearch className="size-5" aria-hidden="true" />ロゴ検索
          </Button>
        </div>
      </nav>
      {/* モバイル: サイドバーSheet */}
      <Sheet
        open={isMobileSidebarOpen}
        onOpenChange={(open, details) => {
          // 並び替え中のEscapeはKeyboardSensorへ渡し、Sheetを閉じずに取消する。
          if (details.reason === "escape-key" && isSidebarDraggingRef.current) {
            details.cancel();
            details.allowPropagation();
            return;
          }
          setIsMobileSidebarOpen(open);
        }}
      >
        <SheetContent
          side="left"
          showCloseButton={false}
          className="mobile-bottom-sheet gap-0 overflow-hidden p-0 data-[side=left]:w-80"
          style={sidebarSwipe.style}
          finalFocus={isDesktopSidebarViewport ? mainRef : sidebarReturnFocusRef}
          onKeyDown={(event) => {
            // Sheetが止める矢印/確定キーをdocument上のKeyboardSensorへ届ける。
            if (isSidebarDraggingRef.current && event.key !== "Escape" && event.key !== "Tab") {
              event.preventBaseUIHandler();
            }
          }}
        >
          <SheetDragHandle
            aria-label="下にスワイプしてウォッチリストを閉じる"
            onClose={() => setIsMobileSidebarOpen(false)}
            {...sidebarSwipe.handleProps}
          />
          <SheetHeader className="shrink-0 flex-row items-center justify-between gap-2 px-5 pt-0 pb-1 md:pt-5">
            <SheetTitle className="text-lg font-semibold tracking-tight">ウォッチリスト</SheetTitle>
            <Button variant="ghost" className="size-11 shrink-0 rounded-full p-0" onClick={() => setIsMobileSidebarOpen(false)} aria-label="ウォッチリストを閉じる">
              <X className="size-5" aria-hidden="true" />
            </Button>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <Sidebar
              onDragStateChange={(dragging) => { isSidebarDraggingRef.current = dragging; }}
              onItemClick={() => {
                sidebarReturnFocusRef.current = mainRef.current;
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
      {/* ロゴ検索Sheet */}
      {hasOpenedLogoSearch && (
        <LogoSearchSheet
          open={isLogoSearchOpen}
          onOpenChange={setIsLogoSearchOpen}
        />
      )}
      {/* セッション切れダイアログ */}
      <SessionExpiredDialog open={isExpired} onLogin={redirectToLogin} />
    </div>
  );
}

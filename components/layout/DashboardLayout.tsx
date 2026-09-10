"use client";

import { useCallback, useRef, useState } from "react";
import { List, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { SessionExpiredDialog } from "./SessionExpiredDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import { LogoSearchSheet } from "@/components/logo/LogoSearchSheet";
import { useNavigationLoading } from "@/components/providers/NavigationLoadingProvider";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { startNavigation } = useNavigationLoading();
  const [isLogoSearchOpen, setIsLogoSearchOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const sidebarReturnFocusRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const isSidebarDraggingRef = useRef(false);
  const handleMobileSidebarOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    sidebarReturnFocusRef.current = event.currentTarget;
    isSidebarDraggingRef.current = false;
    setIsMobileSidebarOpen(true);
  };
  const { isExpired } = useSessionExpiry();
  const handleSessionExpiredLogin = useCallback(async () => {
    // 前ユーザーのデータが次のログインユーザーに見えないよう、
    // SWR のグローバルキャッシュを全破棄する
    await mutate(() => true, undefined, { revalidate: false });
    startNavigation("page", () => router.replace("/login"));
  }, [router, mutate, startNavigation]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Topbar
        onLogoSearchOpen={() => setIsLogoSearchOpen(true)}
        isDesktopSidebarOpen={isDesktopSidebarOpen}
        onDesktopSidebarToggle={() => setIsDesktopSidebarOpen((open) => !open)}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden md:gap-3 md:p-3">
        {/* PC: 開閉可能なサイドバー */}
        <div id="desktop-sidebar" className={isDesktopSidebarOpen ? "hidden md:flex" : "hidden"}>
          <Sidebar />
        </div>
        {/* メインエリア */}
        <main ref={mainRef} tabIndex={-1} className="flex min-w-0 flex-1 flex-col overflow-y-auto md:rounded-3xl md:border md:border-[var(--color-border)]">{children}</main>
      </div>
      <nav aria-label="銘柄とロゴの検索" className="app-chrome shrink-0 border-t border-[var(--color-border)] px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" className="h-12 gap-2 rounded-xl" onClick={handleMobileSidebarOpen} aria-label="銘柄サイドバーを開く" aria-expanded={isMobileSidebarOpen}>
            <List className="size-5" aria-hidden="true" />銘柄一覧
          </Button>
          <Button variant="ghost" className="h-12 gap-2 rounded-xl" onClick={() => setIsLogoSearchOpen(true)} aria-label="ロゴ検索を開く" aria-expanded={isLogoSearchOpen}>
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
          className="mobile-bottom-sheet gap-0 data-[side=left]:w-80"
          finalFocus={sidebarReturnFocusRef}
          onKeyDown={(event) => {
            // Sheetが止める矢印/確定キーをdocument上のKeyboardSensorへ届ける。
            if (isSidebarDraggingRef.current && event.key !== "Escape" && event.key !== "Tab") {
              event.preventBaseUIHandler();
            }
          }}
        >
          <SheetHeader className="shrink-0 pr-12">
            <SheetTitle>ウォッチリスト</SheetTitle>
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
      <LogoSearchSheet
        open={isLogoSearchOpen}
        onOpenChange={setIsLogoSearchOpen}
      />
      {/* セッション切れダイアログ */}
      <SessionExpiredDialog open={isExpired} onLogin={handleSessionExpiredLogin} />
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { SessionExpiredDialog } from "./SessionExpiredDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
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
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar
        onLogoSearchOpen={() => setIsLogoSearchOpen(true)}
        onMobileSidebarOpen={handleMobileSidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* PC: 常時表示サイドバー */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        {/* メインエリア */}
        <main ref={mainRef} tabIndex={-1} className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      {/* モバイル: ボトムナビ */}
      <BottomNav
        onLogoSearchOpen={() => setIsLogoSearchOpen(true)}
        onSidebarOpen={handleMobileSidebarOpen}
      />
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
          className="gap-0 data-[side=left]:w-64"
          finalFocus={sidebarReturnFocusRef}
          onKeyDown={(event) => {
            // Sheetが止める矢印/確定キーをdocument上のKeyboardSensorへ届ける。
            if (isSidebarDraggingRef.current && event.key !== "Escape" && event.key !== "Tab") {
              event.preventBaseUIHandler();
            }
          }}
        >
          <SheetHeader className="shrink-0 pr-12">
            <SheetTitle>銘柄</SheetTitle>
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

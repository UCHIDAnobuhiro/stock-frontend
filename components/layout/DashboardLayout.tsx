"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_KEY } from "@/lib/api";
import { isTokenValid } from "@/lib/auth";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { SessionExpiredDialog } from "./SessionExpiredDialog";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { LogoSearchSheet } from "@/components/logo/LogoSearchSheet";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [isLogoSearchOpen, setIsLogoSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { isExpired } = useSessionExpiry();
  const handleSessionExpiredLogin = useCallback(() => {
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token || !isTokenValid(token)) {
        if (token) localStorage.removeItem(TOKEN_KEY);
        router.replace("/login");
        return;
      }
      setIsAuthReady(true);
    };
    checkAuth();
  }, [router]);

  if (!isAuthReady) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar
        onLogoSearchOpen={() => setIsLogoSearchOpen(true)}
        onMobileSidebarOpen={() => setIsMobileSidebarOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* PC: 常時表示サイドバー */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        {/* メインエリア */}
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      {/* モバイル: ボトムナビ */}
      <BottomNav
        onLogoSearchOpen={() => setIsLogoSearchOpen(true)}
        onSidebarOpen={() => setIsMobileSidebarOpen(true)}
      />
      {/* モバイル: サイドバーSheet */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute inset-y-0 left-0 w-64 bg-[var(--color-surface-1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onItemClick={() => setIsMobileSidebarOpen(false)} />
          </div>
        </div>
      )}
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

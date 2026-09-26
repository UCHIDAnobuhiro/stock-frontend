"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSheetSwipe } from "@/hooks/useSheetSwipe";
import { SheetDragHandle } from "@/components/ui/SheetDragHandle";
import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { SymbolsFallback } from "@/components/providers/SymbolsProvider";

const LogoSearchContent = dynamic(() => import("./LogoSearchContent"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-36 items-center justify-center px-6 py-8">
      <LoadingIndicator label="ロゴ検索を読み込んでいます..." />
    </div>
  ),
});

interface LogoSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoSearchSheet({ open, onOpenChange }: LogoSearchSheetProps) {
  const swipe = useSheetSwipe(() => onOpenChange(false));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        keepMounted
        className="logo-search-sheet gap-0 overflow-hidden p-0"
        style={{
          backgroundColor: "var(--color-surface-1)",
          borderColor: "var(--color-border)",
          ...swipe.style,
        }}
      >
        <SheetDragHandle
          aria-label="下にスワイプしてロゴ検索を閉じる"
          onClose={() => onOpenChange(false)}
          {...swipe.handleProps}
        />
        <SheetHeader className="shrink-0 flex-row items-center justify-between gap-2 px-5 pt-0 pb-1 md:px-8 md:pt-5 md:pb-2">
          <SheetTitle className="text-lg font-semibold tracking-tight md:text-xl">ロゴから探す</SheetTitle>
          <Button variant="ghost" className="size-11 shrink-0 rounded-full p-0" onClick={() => onOpenChange(false)} aria-label="ロゴ検索を閉じる">
            <X className="size-5" aria-hidden="true" />
          </Button>
        </SheetHeader>
        <Suspense fallback={
          <div className="flex min-h-36 items-center justify-center px-6 py-8">
            <LoadingIndicator label="銘柄一覧を読み込んでいます..." />
          </div>
        }>
          <SymbolsFallback>
            <LogoSearchContent open={open} onOpenChange={onOpenChange} />
          </SymbolsFallback>
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}

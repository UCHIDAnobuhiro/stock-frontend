"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSheetSwipe } from "@/hooks/useSheetSwipe";
import { SheetDragHandle } from "@/components/ui/SheetDragHandle";
import { Button } from "@/components/ui/button";
import { LogoDropzone } from "./LogoDropzone";
import { LogoDetectResults } from "./LogoDetectResults";
import { CompanyAnalysisCard } from "./CompanyAnalysisCard";
import { useLogoDetect } from "@/hooks/useLogoDetect";
import { useLogoAnalyze } from "@/hooks/useLogoAnalyze";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useSelectedSymbol } from "@/hooks/useSelectedSymbol";
import { useSymbols } from "@/hooks/useSymbols";

interface LogoSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoSearchSheet({ open, onOpenChange }: LogoSearchSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const swipe = useSheetSwipe(() => onOpenChange(false));
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [analysisTarget, setAnalysisTarget] = useState<string | null>(null);
  const [isAddingToWatchlist, setIsAddingToWatchlist] = useState(false);
  const {
    results,
    hasSearched,
    isLoading: isDetecting,
    error: detectError,
    detect,
    reset: resetDetect,
  } = useLogoDetect();
  const { analysis, isLoading: isAnalyzing, error: analyzeError, analyze, reset: resetAnalysis } = useLogoAnalyze();
  const {
    items: watchlistItems,
    isLoading: isWatchlistLoading,
    addSymbol,
  } = useWatchlist();
  const { symbols, isLoading: isSymbolsLoading } = useSymbols();
  const { setSymbol } = useSelectedSymbol();

  const ticker = analysis?.ticker?.toUpperCase() ?? null;
  const matchedSymbol = ticker
    ? symbols.find((symbol) => symbol.code.toUpperCase() === ticker)
    : undefined;
  const isInWatchlist = matchedSymbol
    ? watchlistItems.some((item) => item.symbol_code === matchedSymbol.code)
    : false;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Move only the sheet's scroll container, keeping the page behind it still.
  useEffect(() => {
    if (!open || (!isAnalyzing && !analysis && !analyzeError)) return;
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const target = analysisRef.current;
      if (!container || !target) return;
      container.scrollTo({
        top: container.scrollTop + target.getBoundingClientRect().top
          - container.getBoundingClientRect().top - 16,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, isAnalyzing, analysis, analyzeError]);

  const handleFile = (file: File) => {
    resetDetect();
    resetAnalysis();
    setAnalysisTarget(null);
    setFileError(null);
    setActionError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    detect(file).catch(() => {});
  };

  const handleAnalyze = (name: string) => {
    resetAnalysis();
    setAnalysisTarget(name);
    setActionError(null);
    analyze(name).catch(() => {});
  };

  const handleReset = () => {
    resetDetect();
    resetAnalysis();
    setAnalysisTarget(null);
    setFileError(null);
    setActionError(null);
    setPreview(null);
  };

  const handleViewChart = () => {
    if (!matchedSymbol) return;

    setActionError(null);
    setSymbol(matchedSymbol.code);
    onOpenChange(false);
  };

  const handleAddToWatchlist = async () => {
    if (!matchedSymbol || isInWatchlist || isAddingToWatchlist) return;

    setActionError(null);
    setIsAddingToWatchlist(true);
    try {
      await addSymbol(matchedSymbol.code);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "ウォッチリストへの追加に失敗しました",
      );
    } finally {
      setIsAddingToWatchlist(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
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
        <div ref={scrollRef} className="min-h-0 overflow-y-auto overscroll-contain">
          <div className="space-y-5 px-6 pt-4 pb-8 sm:px-8">
            <LogoDropzone
              onFile={handleFile}
              onValidationError={setFileError}
              isLoading={isDetecting}
              preview={preview}
            />


            {results.length > 0 && (
              <LogoDetectResults
                results={results}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                analysisTarget={analysisTarget}
                hasAnalysis={analysis !== null}
              />
            )}

            {hasSearched &&
              !isDetecting &&
              results.length === 0 &&
              !detectError && (
                <div
                  role="status"
                  className="rounded-lg p-3 text-xs"
                  style={{
                    backgroundColor: "var(--color-surface-3)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <p className="font-medium">ロゴを検出できませんでした</p>
                  <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
                    ロゴが大きく鮮明に写った別の画像をお試しください。
                  </p>
                </div>
              )}

            {(fileError || detectError || actionError) && (
              <p
                role="alert"
                className="text-xs"
                style={{ color: "var(--color-bear)" }}
              >
                {fileError ?? detectError ?? actionError}
              </p>
            )}

            {(isAnalyzing || analysis || analyzeError) && (
              <div ref={analysisRef} className="space-y-3" role="region" aria-label="企業分析">
                <h3 className="text-sm font-semibold">企業分析</h3>
                {analyzeError && <p role="alert" className="text-xs text-[var(--color-bear)]">{analyzeError}</p>}
                <CompanyAnalysisCard
                  analysis={analysis}
                  isLoading={isAnalyzing}
                  symbolCode={matchedSymbol?.code ?? null}
                  isResolvingSymbol={Boolean(ticker) && isSymbolsLoading}
                  isInWatchlist={isInWatchlist}
                  isWatchlistLoading={isWatchlistLoading}
                  isAddingToWatchlist={isAddingToWatchlist}
                  onViewChart={handleViewChart}
                  onAddToWatchlist={handleAddToWatchlist}
                />
              </div>
            )}

            {(results.length > 0 || preview) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs gap-1.5"
                style={{ color: "var(--color-text-muted)" }}
                onClick={handleReset}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                別の画像を試す
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

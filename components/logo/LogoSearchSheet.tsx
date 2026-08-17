"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
        className="w-full sm:w-96 p-0 flex flex-col"
        style={{
          backgroundColor: "var(--color-surface-1)",
          borderColor: "var(--color-border)",
        }}
      >
        <SheetHeader
          className="px-4 py-3 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <SheetTitle
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            ロゴ検索
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="min-h-full space-y-4 p-4">
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

            {(fileError || detectError || analyzeError || actionError) && (
              <p
                role="alert"
                className="text-xs"
                style={{ color: "var(--color-bear)" }}
              >
                {fileError ?? detectError ?? analyzeError ?? actionError}
              </p>
            )}

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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

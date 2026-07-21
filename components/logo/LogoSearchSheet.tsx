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
import { findBestMatch } from "@/lib/companyMatch";

interface LogoSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoSearchSheet({ open, onOpenChange }: LogoSearchSheetProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const { results, isLoading: isDetecting, error: detectError, detect, reset: resetDetect } = useLogoDetect();
  const { analysis, isLoading: isAnalyzing, error: analyzeError, analyze, reset: resetAnalysis } = useLogoAnalyze();
  const { addSymbol } = useWatchlist();
  const { symbols } = useSymbols();
  const { setSymbol } = useSelectedSymbol();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (file: File) => {
    resetDetect();
    resetAnalysis();
    setMatchError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    detect(file);
  };

  const handleAnalyze = (name: string) => {
    resetAnalysis();
    analyze(name).catch(() => {});
  };

  const handleReset = () => {
    resetDetect();
    resetAnalysis();
    setMatchError(null);
    setPreview(null);
  };

  const handleViewChart = (name: string) => {
    const symbol = findBestMatch(name, symbols, (s) => s.name);
    if (symbol) {
      setMatchError(null);
      setSymbol(symbol.code);
      onOpenChange(false);
    } else {
      setMatchError(`「${name}」に対応する銘柄が見つかりませんでした`);
    }
  };

  const handleAddToWatchlist = (name: string) => {
    const symbol = findBestMatch(name, symbols, (s) => s.name);
    if (symbol) {
      setMatchError(null);
      addSymbol(symbol.code);
    } else {
      setMatchError(`「${name}」に対応する銘柄が見つかりませんでした`);
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

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            <LogoDropzone
              onFile={handleFile}
              isLoading={isDetecting}
              preview={preview}
            />

            {results.length > 0 && (
              <LogoDetectResults
                results={results}
                onViewChart={handleViewChart}
                onAddToWatchlist={handleAddToWatchlist}
                onAnalyze={handleAnalyze}
              />
            )}

            {(detectError || analyzeError || matchError) && (
              <p className="text-xs" style={{ color: "var(--color-bear)" }}>
                {detectError ?? analyzeError ?? matchError}
              </p>
            )}

            <CompanyAnalysisCard
              analysis={analysis}
              isLoading={isAnalyzing}
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

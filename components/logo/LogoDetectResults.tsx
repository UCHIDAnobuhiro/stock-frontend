"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DetectedLogoResponse } from "@/hooks/useLogoDetect";

interface LogoDetectResultsProps {
  results: DetectedLogoResponse[];
  onAnalyze: (name: string) => void;
  isAnalyzing: boolean;
  analysisTarget: string | null;
  hasAnalysis: boolean;
}

export function LogoDetectResults({
  results,
  onAnalyze,
  isAnalyzing,
  analysisTarget,
  hasAnalysis,
}: LogoDetectResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-text-muted)" }}
      >
        検出結果
      </p>
      <div className="space-y-2">
        {results.map((result) => {
          const isAnalysisTarget = analysisTarget === result.name;
          const buttonLabel =
            isAnalyzing && isAnalysisTarget
              ? "分析中..."
              : hasAnalysis && isAnalysisTarget
                ? "再分析"
                : "企業分析";

          return (
            <div
              key={result.name}
              className="flex items-center gap-2 rounded-lg p-2"
              style={{ backgroundColor: "var(--color-surface-3)" }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {result.name}
                </p>
                <Badge
                  variant="secondary"
                  className="mt-0.5 px-1.5 py-0 text-[11px] sm:text-[10px]"
                  style={{
                    backgroundColor: "var(--color-surface-2)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  信頼度: {Math.round(result.confidence * 100)}%
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 px-2 text-xs"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-surface-2)",
                  color: "var(--color-text-secondary)",
                }}
                aria-label={`${result.name}を${buttonLabel}`}
                disabled={isAnalyzing}
                onClick={() => onAnalyze(result.name)}
              >
                {buttonLabel}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

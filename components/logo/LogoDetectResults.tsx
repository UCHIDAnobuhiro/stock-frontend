"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DetectedLogoResponse } from "@/hooks/useLogoDetect";

interface LogoDetectResultsProps {
  results: DetectedLogoResponse[];
  onAnalyze: (name: string) => void;
  isAnalyzing: boolean;
  hasAnalysis: boolean;
}

export function LogoDetectResults({
  results,
  onAnalyze,
  isAnalyzing,
  hasAnalysis,
}: LogoDetectResultsProps) {
  if (results.length === 0) return null;

  const topResult = results[0];

  return (
    <div className="space-y-3">
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-text-muted)" }}
      >
        検出結果
      </p>
      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded-lg p-2"
            style={{ backgroundColor: "var(--color-surface-3)" }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {result.name}
              </p>
              <Badge
                variant="secondary"
                className="mt-0.5 text-[10px] px-1.5 py-0"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  color: "var(--color-text-muted)",
                }}
              >
                信頼度: {Math.round(result.confidence * 100)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface-2)",
          color: "var(--color-text-secondary)",
        }}
        disabled={isAnalyzing}
        onClick={() => onAnalyze(topResult.name)}
      >
        {isAnalyzing
          ? "企業分析を生成中..."
          : hasAnalysis
            ? "企業分析を再生成"
            : "企業分析を生成"}
      </Button>
    </div>
  );
}

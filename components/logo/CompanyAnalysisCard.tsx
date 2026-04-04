"use client";

import type { CompanyAnalysisResponse } from "@/hooks/useLogoAnalyze";

interface CompanyAnalysisCardProps {
  analysis: CompanyAnalysisResponse | null;
  isLoading: boolean;
}

export function CompanyAnalysisCard({ analysis, isLoading }: CompanyAnalysisCardProps) {
  if (!isLoading && !analysis) return null;

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{ backgroundColor: "var(--color-surface-3)" }}
    >
      {isLoading ? (
        <>
          <div
            className="h-4 w-24 rounded animate-pulse"
            style={{ backgroundColor: "var(--color-surface-2)" }}
          />
          <div className="space-y-1.5">
            {[100, 80, 90, 70].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded animate-pulse"
                style={{
                  width: `${w}%`,
                  backgroundColor: "var(--color-surface-2)",
                }}
              />
            ))}
          </div>
        </>
      ) : analysis ? (
        <>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {analysis.company_name}
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {analysis.summary}
          </p>
        </>
      ) : null}
    </div>
  );
}

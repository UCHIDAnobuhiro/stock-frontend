"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
          <div
            className="text-xs leading-relaxed space-y-1 max-h-60 overflow-y-auto scrollbar-thin"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th
                    className="px-2 py-1 text-left font-semibold border-b"
                    style={{ color: "var(--color-text-primary)", borderColor: "var(--color-surface-2)" }}
                  >
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td
                    className="px-2 py-1 border-b"
                    style={{ borderColor: "var(--color-surface-2)" }}
                  >
                    {children}
                  </td>
                ),
                p: ({ children }) => <p className="mb-1">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5">{children}</ol>,
                h1: ({ children }) => <p className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{children}</p>,
                h2: ({ children }) => <p className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{children}</p>,
                h3: ({ children }) => <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{children}</p>,
              }}
            >
              {analysis.summary}
            </ReactMarkdown>
          </div>
        </>
      ) : null}
    </div>
  );
}

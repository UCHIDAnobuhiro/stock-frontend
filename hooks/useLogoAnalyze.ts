"use client";

import { useState } from "react";
import apiClient from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type CompanyAnalysisResponse = components["schemas"]["CompanyAnalysisResponse"];

export function useLogoAnalyze() {
  const [analysis, setAnalysis] = useState<CompanyAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (companyName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await apiClient.POST("/v1/logo/analyze", {
        body: { company_name: companyName },
      });
      if (apiError) throw new Error("企業分析に失敗しました");
      setAnalysis(data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "企業分析に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setAnalysis(null);
    setError(null);
  };

  return { analysis, isLoading, error, analyze, reset };
}

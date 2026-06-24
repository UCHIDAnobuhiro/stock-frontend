"use client";

import useSWRMutation from "swr/mutation";
import apiClient, { CSRF_HEADER } from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type CompanyAnalysisResponse = components["schemas"]["CompanyAnalysisResponse"];

async function analyzeCompany(_key: string, { arg }: { arg: string }) {
  const { data, error } = await apiClient.POST("/v1/logo/analyze", {
    params: { header: CSRF_HEADER },
    body: { company_name: arg },
  });
  if (error) {
    console.error("[useLogoAnalyze] API error:", error);
    throw new Error("企業分析に失敗しました");
  }
  return data ?? null;
}

export function useLogoAnalyze() {
  const { trigger, data, isMutating, error, reset } = useSWRMutation(
    "/v1/logo/analyze",
    analyzeCompany
  );

  return {
    analysis: data ?? null,
    isLoading: isMutating,
    error: error instanceof Error ? error.message : error ? "企業分析に失敗しました" : null,
    analyze: trigger,
    reset,
  };
}

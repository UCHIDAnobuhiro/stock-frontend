"use client";

import useSWRMutation from "swr/mutation";
import apiClient from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type CompanyAnalysisResponse = components["schemas"]["CompanyAnalysisResponse"];

async function analyzeCompany(_key: string, { arg }: { arg: string }) {
  const { data, error, response } = await apiClient.POST("/v1/logo/analyze", {
    body: { company_name: arg },
  });
  if (error) {
    console.error("[useLogoAnalyze] API error:", error);
    switch (response.status) {
      case 429:
        throw new Error(
          "リクエストが多すぎます。しばらく時間をおいてから再度お試しください",
        );
      case 503:
        throw new Error(
          "サービスが一時的に利用できません。時間をおいて再度お試しください",
        );
      default:
        throw new Error("企業分析に失敗しました");
    }
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

"use client";

import useSWRMutation from "swr/mutation";
import apiClient, { createApiError } from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type DetectedLogoResponse = components["schemas"]["DetectedLogoResponse"];

async function detectLogo(_key: string, { arg }: { arg: File }) {
  const { data, error, response } = await apiClient.POST("/v1/logo/detect", {
    body: { image: arg } as never,
    bodySerializer: () => {
      const formData = new FormData();
      formData.append("image", arg);
      return formData;
    },
  });
  if (error) {
    switch (response.status) {
      case 413:
        throw createApiError(response.status, "ロゴ検出に失敗しました");
      case 429:
        throw new Error(
          "リクエストが多すぎます。しばらく時間をおいてから再度お試しください",
        );
      case 503:
        throw new Error(
          "サービスが一時的に利用できません。時間をおいて再度お試しください",
        );
      default:
        throw new Error("ロゴ検出に失敗しました");
    }
  }
  return data ?? [];
}

export function useLogoDetect() {
  const { trigger, data, isMutating, error, reset } = useSWRMutation(
    "/v1/logo/detect",
    detectLogo
  );

  return {
    results: data ?? [],
    hasSearched: data !== undefined,
    isLoading: isMutating,
    error: error instanceof Error ? error.message : error ? "ロゴ検出に失敗しました" : null,
    detect: trigger,
    reset,
  };
}

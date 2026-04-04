"use client";

import useSWRMutation from "swr/mutation";
import apiClient from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type DetectedLogoResponse = components["schemas"]["DetectedLogoResponse"];

async function detectLogo(_key: string, { arg }: { arg: File }) {
  const { data, error } = await apiClient.POST("/v1/logo/detect", {
    body: { image: arg } as never,
    bodySerializer: () => {
      const formData = new FormData();
      formData.append("image", arg);
      return formData;
    },
  });
  if (error) throw new Error("ロゴ検出に失敗しました");
  return data ?? [];
}

export function useLogoDetect() {
  const { trigger, data, isMutating, error, reset } = useSWRMutation(
    "/v1/logo/detect",
    detectLogo
  );

  return {
    results: data ?? [],
    isLoading: isMutating,
    error: error instanceof Error ? error.message : error ? "ロゴ検出に失敗しました" : null,
    detect: trigger,
    reset,
  };
}

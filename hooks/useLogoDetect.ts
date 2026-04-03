"use client";

import { useState } from "react";
import apiClient from "@/lib/api";
import type { components } from "@/lib/generated/schema";

export type DetectedLogoResponse = components["schemas"]["DetectedLogoResponse"];

export function useLogoDetect() {
  const [results, setResults] = useState<DetectedLogoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const { data, error: apiError } = await apiClient.POST("/v1/logo/detect", {
        body: { image: file } as never,
        bodySerializer: () => {
          const formData = new FormData();
          formData.append("image", file);
          return formData;
        },
      });
      if (apiError) throw new Error("ロゴ検出に失敗しました");
      setResults(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ロゴ検出に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResults([]);
    setError(null);
  };

  return { results, isLoading, error, detect, reset };
}

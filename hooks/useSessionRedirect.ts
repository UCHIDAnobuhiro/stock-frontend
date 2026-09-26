"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { useNavigationLoading } from "./useNavigationLoading";

/** 認証終了時は全キャッシュの破棄が完了してからログイン画面へ移る。 */
export function useSessionRedirect() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { startNavigation } = useNavigationLoading();

  return useCallback(async () => {
    await mutate(() => true, undefined, { revalidate: false });
    startNavigation(() => router.replace("/login"));
  }, [mutate, router, startNavigation]);
}

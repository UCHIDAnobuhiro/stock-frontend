"use client";

import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useSWRConfig } from "swr";
import { useNavigationLoading } from "./useNavigationLoading";

/** 認証終了時は全キャッシュの破棄が完了してからログイン画面へ移る。 */
export function useSessionRedirect() {
  const navigate = useNavigate();
  const { unload } = useSWRConfig();
  const { startNavigation } = useNavigationLoading();

  return useCallback(() => {
    unload({ revalidate: false });
    startNavigation(() => void navigate("/login", { replace: true }));
  }, [unload, navigate, startNavigation]);
}

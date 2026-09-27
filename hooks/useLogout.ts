"use client";

import apiClient from "@/lib/api";
import { useState } from "react";
import { useSessionRedirect } from "./useSessionRedirect";

/**
 * ログアウト処理を提供するフック。
 * DELETE /v1/logout を呼び出してサーバー側の Cookie を削除し、
 * SWR のグローバルキャッシュを全破棄してからログインページへリダイレクトする。
 * キャッシュを破棄しないと、前のユーザーのデータが次にログインしたユーザーに
 * 見えてしまうため、成功後に必ず破棄する。失敗時は認証Cookieが残り得るため画面を維持する。
 */
export function useLogout() {
  const redirectToLogin = useSessionRedirect();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      const { response } = await apiClient.DELETE("/v1/logout");
      if (!response.ok) throw new Error(`Logout failed: ${response.status}`);
      await redirectToLogin();
    } catch (error) {
      console.warn("Logout request failed:", error);
      setLogoutError("ログアウトできませんでした。時間をおいて再度お試しください。");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return { handleLogout, isLoggingOut, logoutError };
}

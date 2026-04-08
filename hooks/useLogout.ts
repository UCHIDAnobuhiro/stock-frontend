"use client";

import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";

/**
 * ログアウト処理を提供するフック。
 * DELETE /v1/logout を呼び出してサーバー側の Cookie を削除し、
 * ログインページへリダイレクトする。
 */
export function useLogout() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await apiClient.DELETE("/v1/logout");
    } catch (error) {
      // ネットワークエラーでもクライアント側はログイン画面へ遷移する
      console.warn("Logout request failed:", error);
    }
    router.replace("/login");
  }

  return { handleLogout };
}

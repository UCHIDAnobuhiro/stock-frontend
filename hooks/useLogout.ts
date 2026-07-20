"use client";

import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import apiClient from "@/lib/api";

/**
 * ログアウト処理を提供するフック。
 * DELETE /v1/logout を呼び出してサーバー側の Cookie を削除し、
 * SWR のグローバルキャッシュを全破棄してからログインページへリダイレクトする。
 * キャッシュを破棄しないと、前のユーザーのデータが次にログインしたユーザーに
 * 見えてしまうため、API 呼び出しの成否に関わらず必ず破棄する。
 */
export function useLogout() {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  async function handleLogout() {
    try {
      await apiClient.DELETE("/v1/logout");
    } catch (error) {
      // ネットワークエラーでもクライアント側はログイン画面へ遷移する
      console.warn("Logout request failed:", error);
    }
    // 前ユーザーのデータが次のログインユーザーに見えないよう、
    // SWR のグローバルキャッシュを全破棄する
    await mutate(() => true, undefined, { revalidate: false });
    router.replace("/login");
  }

  return { handleLogout };
}

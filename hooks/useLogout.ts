"use client";

import { useRouter } from "next/navigation";
import { TOKEN_KEY } from "@/lib/api";

/**
 * ログアウト処理を提供するフック。
 * localStorage から JWT を削除してログインページへリダイレクトする。
 */
export function useLogout() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    router.replace("/login");
  }

  return { handleLogout };
}

"use client";

import { useRouter } from "next/navigation";
import { TOKEN_KEY } from "@/lib/api";

export function useLogout() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    router.replace("/login");
  }

  return { handleLogout };
}

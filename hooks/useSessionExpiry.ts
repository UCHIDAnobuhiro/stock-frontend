"use client";

import { useEffect, useState, useCallback } from "react";
import { TOKEN_KEY, SESSION_EXPIRED_EVENT } from "@/lib/api";
import { isTokenValid } from "@/lib/auth";

const POLL_INTERVAL_MS = 60_000;

/**
 * セッション切れを検知するフック。
 * 60 秒ごとにトークンの有効期限をチェック（能動的検知）し、
 * API から 401 が返った際のカスタムイベントも監視する（受動的検知）。
 * いずれかが検知されると isExpired が true になる（一方通行ラッチ）。
 */
export function useSessionExpiry() {
  const [isExpired, setIsExpired] = useState(false);

  const expire = useCallback(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) localStorage.removeItem(TOKEN_KEY);
    } catch {
      // storage が使えない環境ではスキップ
    }
    setIsExpired(true);
  }, []);

  // 能動的: 60 秒ごとにトークン有効期限をチェック
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && !isTokenValid(token)) expire();
      } catch {
        // storage が使えない環境ではスキップ
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [expire]);

  // 受動的: API 401 によるカスタムイベントを監視
  useEffect(() => {
    const handler = () => expire();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [expire]);

  return { isExpired };
}

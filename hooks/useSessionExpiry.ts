"use client";

import { useEffect, useState, useCallback } from "react";
import { SESSION_EXPIRED_EVENT } from "@/lib/api";
import { getCsrfToken } from "@/lib/auth";

const POLL_INTERVAL_MS = 60_000;

/**
 * セッション切れを検知するフック。
 * マウント直後および 60 秒ごとに csrf_token Cookie の存在を確認（能動的検知）し、
 * refresh と再送後も API から 401 が返った際のカスタムイベントも監視する（受動的検知）。
 * いずれかが検知されると isExpired が true になる（一方通行ラッチ）。
 */
export function useSessionExpiry() {
  const [isExpired, setIsExpired] = useState(false);

  const expire = useCallback(() => {
    setIsExpired(true);
  }, []);

  // 能動的: マウント直後に1回、以降 60 秒ごとに csrf_token Cookie の存在を確認
  useEffect(() => {
    const check = () => {
      if (getCsrfToken() === null) expire();
    };
    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
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

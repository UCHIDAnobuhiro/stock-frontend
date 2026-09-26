"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_SIDEBAR_BREAKPOINT = 768;

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function getSnapshot() {
  return window.innerWidth >= DESKTOP_SIDEBAR_BREAKPOINT;
}

// SSR 時は描画せず、ハイドレーション後に viewport の幅へ合わせる。
function getServerSnapshot() {
  return false;
}

export function useIsDesktopSidebar() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

"use client";

import { useSyncExternalStore } from "react";

function subscribeViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
const isMobileViewport = () => window.innerWidth < 640;
const serverSnapshot = () => false;

export function useIsMobile() {
  return useSyncExternalStore(subscribeViewport, isMobileViewport, serverSnapshot);
}

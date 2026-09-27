/**
 * API URL の末尾スラッシュを除去し、パス結合と CSP の表現を統一する。
 */
export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ?? ""
).replace(/\/$/, "");

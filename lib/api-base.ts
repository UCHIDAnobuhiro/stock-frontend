/** API ベース URL の末尾スラッシュを除去して、パス結合と CSP の表現を統一する。 */
export function normalizeApiBaseUrl(apiBaseUrl: string | undefined): string {
  return (apiBaseUrl ?? "").replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
}

export const API_BASE = getApiBaseUrl();

/**
 * JWT トークンの有効性を検証する。
 * ペイロードの `exp` クレームをデコードし、現在時刻と比較する。
 * トークンのフォーマットが不正・期限切れ・`exp` 欠損のいずれかで false を返す。
 */
export function isTokenValid(token: string): boolean {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return false;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

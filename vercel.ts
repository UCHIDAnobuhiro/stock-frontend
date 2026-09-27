import type { VercelConfig } from "@vercel/config/v1";
import { validateApiBaseUrl } from "./config/api-url";

export function createVercelConfig(apiBaseUrl: string | undefined): VercelConfig {
  const apiOrigin = validateApiBaseUrl(apiBaseUrl).origin;
  return {
    framework: "vite",
    outputDirectory: "dist",
    // 実ファイルの欠落を index.html に書き換えると、JS や font の読み込み失敗が HTML として隠れる。
    rewrites: [{ source: "/((?!assets/|fonts/|.*\\.[^/]+$).*)", destination: "/index.html" }],
    headers: [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://api.twelvedata.com https://logo.twelvedata.com; connect-src 'self' ${apiOrigin}; font-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'` },
      ],
    }],
  };
}

export const config: VercelConfig = createVercelConfig(process.env.VITE_API_BASE_URL);

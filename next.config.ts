import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // クリックジャッキング対策
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // MIME スニッフィング対策
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // リファラー情報の制御
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // 不要なブラウザ機能を無効化
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Content Security Policy
            // NOTE: script-src の 'unsafe-inline' は Next.js のハイドレーション用。
            // 'unsafe-eval' は開発時のみ（React がコールスタック再構築に使用）。
            // 本番では eval() は使われないため除外される。
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://api.twelvedata.com https://logo.twelvedata.com",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}`,
              "font-src 'self'",
              "frame-src 'none'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

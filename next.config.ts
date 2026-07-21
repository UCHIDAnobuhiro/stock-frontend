import type { NextConfig } from "next";

// NOTE: Content-Security-Policy はリクエストごとの nonce が必要なため
// ここではなく proxy.ts で付与している。
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
        ],
      },
    ];
  },
};

export default nextConfig;

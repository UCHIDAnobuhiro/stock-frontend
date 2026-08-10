import type { NextConfig } from "next";

// NOTE: Content-Security-Policy はリクエストごとの nonce が必要なため
// ここではなく proxy.ts で付与している。
const nextConfig: NextConfig = {
  // `next dev` は AI コーディングエージェントを検知すると AGENTS.md / CLAUDE.md に
  // 管理ブロック（<!-- BEGIN:nextjs-agent-rules -->）を自動追記する。
  // このリポジトリでは AGENTS.md を正本、CLAUDE.md をその参照（@AGENTS.md）として
  // 明示的に管理しているため、自動追記を無効化して記述の責任範囲を保つ。
  agentRules: false,

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

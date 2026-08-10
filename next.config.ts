import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

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

/**
 * `NEXT_PUBLIC_API_BASE_URL` はビルド時にバンドルへインライン化されるため、
 * ランタイムの環境変数では上書きできない。未設定のままビルドすると
 * `API_BASE` が空文字になり全 API リクエストが同一オリジンへ飛ぶが、
 * ビルドもサーバー起動も成功してしまい発見が遅れる。
 * そのためビルドフェーズでのみ明示的に失敗させる。
 *
 * ランタイム（`next start`）では検査しない。この変数はビルド成果物に
 * 焼き込まれており、起動時に存在する必要がないため。
 */
export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD && !process.env.NEXT_PUBLIC_API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is required at build time.\n" +
        "この変数はビルド時にバンドルへインライン化されるため、ランタイムに設定しても反映されません。\n" +
        "例: NEXT_PUBLIC_API_BASE_URL=https://api.example.com npm run build",
    );
  }
  return nextConfig;
}

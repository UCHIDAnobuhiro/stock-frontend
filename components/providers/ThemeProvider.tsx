"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes は描画前にテーマを適用するため inline script を挿入する。
 * proxy.ts の CSP は `script-src 'self' 'nonce-...' 'strict-dynamic'` のため、
 * nonce を渡さないとこの script がブロックされ、ハイドレーションまで
 * ライトテーマ（globals.css の :root）で描画される＝白フラッシュが起きる。
 */
export function ThemeProvider({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
    </NextThemesProvider>
  );
}

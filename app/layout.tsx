import type { Metadata } from "next";
import { headers } from "next/headers";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { NavigationLoadingProvider } from "@/components/providers/NavigationLoadingProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock View App",
  description: "株価チャート・ウォッチリスト管理",
};

/**
 * proxy.ts がリクエストごとに生成した nonce を `x-nonce` ヘッダーから受け取り、
 * next-themes の inline script に渡す（CSP でブロックされないようにするため）。
 *
 * `headers()` の参照によりこのレイアウトを含む全ページが動的レンダリングになる。
 * nonce はリクエストごとに変わるため静的生成とは元々両立せず、これは意図した挙動。
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="ja"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full bg-[var(--color-bg)] text-[var(--color-text-primary)]">
        <ThemeProvider nonce={nonce}>
          <NavigationLoadingProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </NavigationLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

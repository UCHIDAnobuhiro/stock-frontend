"use client"

import { useEffect } from "react"

import "./globals.css"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ja">
      <body className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-primary)]">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-8 py-10 text-center">
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
            エラーが発生しました
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            アプリケーションで問題が発生しました。再読み込みしてください。
          </p>
          <button
            onClick={reset}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  )
}

"use client"

import { useEffect } from "react"
import { CircleAlert } from "lucide-react"

import { ErrorPageShell } from "@/components/error/ErrorPageShell"
import { Button } from "@/components/ui/button"

export default function Error({
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
    <ErrorPageShell
      icon={<CircleAlert className="h-12 w-12 text-[var(--color-bear)]" />}
      title="エラーが発生しました"
      description="ページの表示中に問題が発生しました。時間をおいて再度お試しください。"
    >
      {error.digest && (
        <p className="text-xs text-[var(--color-text-muted)]">
          エラーコード: {error.digest}
        </p>
      )}
      <Button onClick={reset}>再試行</Button>
    </ErrorPageShell>
  )
}

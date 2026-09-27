import { Link } from "react-router"
import { FileQuestion } from "lucide-react"

import { ErrorPageShell } from "@/components/error/ErrorPageShell"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <ErrorPageShell
      icon={
        <>
          <FileQuestion className="h-12 w-12 text-[var(--color-text-muted)]" />
          <p className="font-mono text-4xl font-bold text-[var(--color-text-muted)]">
            404
          </p>
        </>
      }
      title="ページが見つかりません"
      description="お探しのページは存在しないか、移動した可能性があります。"
    >
      <Link to="/" className={cn(buttonVariants())}>
        ホームに戻る
      </Link>
    </ErrorPageShell>
  )
}

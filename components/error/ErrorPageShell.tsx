import type { ReactNode } from "react"

type ErrorPageShellProps = {
  icon: ReactNode
  title: string
  description: string
  children?: ReactNode
}

export function ErrorPageShell({
  icon,
  title,
  description,
  children,
}: ErrorPageShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-8 py-10 text-center">
        {icon}
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {title}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {description}
        </p>
        {children}
      </div>
    </main>
  )
}

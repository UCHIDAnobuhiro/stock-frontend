import { LoaderCircle } from "lucide-react";

interface LoadingIndicatorProps {
  label: string;
}

export function LoadingIndicator({ label }: LoadingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-7 animate-spin text-[var(--color-accent)]"
      />
      <span className="text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
      </span>
    </div>
  );
}

export function PageLoadingScreen() {
  return (
    <div
      aria-busy="true"
      className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-[var(--color-bg)]/95 backdrop-blur-[2px]"
    >
      <LoadingIndicator label="画面を読み込んでいます..." />
    </div>
  );
}

export function ChartLoadingOverlay() {
  return (
    <div
      aria-busy="true"
      className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-bg)]/80 backdrop-blur-[1px]"
    >
      <LoadingIndicator label="チャートを読み込んでいます..." />
    </div>
  );
}

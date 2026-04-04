export function ChartSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      <div
        className="h-4 w-32 rounded animate-pulse"
        style={{ backgroundColor: "var(--color-surface-3)" }}
      />
      <div
        className="flex-1 rounded animate-pulse"
        style={{ backgroundColor: "var(--color-surface-3)" }}
      />
      <div
        className="h-16 rounded animate-pulse"
        style={{ backgroundColor: "var(--color-surface-3)" }}
      />
    </div>
  );
}

import { BarChart2 } from "lucide-react";

export function ChartEmpty() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3"
      style={{ color: "var(--color-text-muted)" }}
    >
      <BarChart2 className="h-12 w-12" />
      <p className="text-sm">銘柄を選択してチャートを表示</p>
    </div>
  );
}

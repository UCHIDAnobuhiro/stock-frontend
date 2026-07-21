import { BarChart2 } from "lucide-react";

interface ChartEmptyProps {
  message?: string;
}

export function ChartEmpty({ message = "銘柄を選択してチャートを表示" }: ChartEmptyProps) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3"
      style={{ color: "var(--color-text-muted)" }}
    >
      <BarChart2 className="h-12 w-12" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

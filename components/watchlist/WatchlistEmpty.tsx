import { Plus } from "lucide-react";

export function WatchlistEmpty() {
  return (
    <div
      className="flex flex-col items-center gap-2 px-4 py-8 text-center"
      style={{ color: "var(--color-text-muted)" }}
    >
      <Plus className="h-8 w-8" />
      <p className="text-xs">銘柄を追加して<br />ウォッチリストを作成</p>
    </div>
  );
}

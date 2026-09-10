import { ListFilter, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverClose,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BOLLINGER_SERIES,
  getSmaColor,
  type BollingerBandData,
  type SmaSeriesData,
} from "@/lib/indicators";

interface IndicatorReadoutProps {
  time: string;
  intervalLabel: string;
  smaEnabled: boolean;
  bollingerEnabled: boolean;
  smaData: SmaSeriesData[];
  band: BollingerBandData | undefined;
}

const formatPrice = (value: number) => value.toLocaleString("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function IndicatorValue({ label, color, value }: {
  label: string;
  color: string;
  value: number | undefined;
}) {
  return (
    <span className="whitespace-nowrap">
      <span
        aria-hidden="true"
        className="mr-1 inline-block h-0.5 w-2 align-middle"
        style={{ backgroundColor: color }}
      />
      {label} {value === undefined ? "—" : formatPrice(value)}
    </span>
  );
}

/** チャートで選択した足の指標値を表示する。選択・計算は親が管理する。 */
export function IndicatorReadout({
  time,
  intervalLabel,
  smaEnabled,
  bollingerEnabled,
  smaData,
  band,
}: IndicatorReadoutProps) {
  return (
    <Popover
      key={String(smaEnabled || bollingerEnabled)}
      modal={false}
      onOpenChange={(open, details) => {
        // 指標値を表示したままチャートを操作できるよう、外側の操作では閉じない。
        if (!open && (details.reason === "outside-press" || details.reason === "focus-out")) {
          details.cancel();
        }
      }}
    >
      <PopoverTrigger
        disabled={!smaEnabled && !bollingerEnabled}
        className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs hover:bg-[var(--color-surface-3)] disabled:opacity-40"
        aria-label="指標値を表示"
      >
        <ListFilter className="size-3.5" aria-hidden="true" />指標値
      </PopoverTrigger>
      <PopoverContent initialFocus={false} align="end" className="w-72 max-w-[calc(100vw-2rem)] max-h-[min(360px,60dvh)] overflow-y-auto rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <PopoverTitle>指標値</PopoverTitle>
          <PopoverClose aria-label="指標値を閉じる" className="flex size-9 items-center justify-center rounded-full hover:bg-[var(--color-surface-3)]">
            <X className="size-4" aria-hidden="true" />
          </PopoverClose>
        </div>
        <p className="text-xs tabular-nums text-[var(--color-text-secondary)]">
          {time.replaceAll("-", "/")} · {intervalLabel}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-2 text-xs tabular-nums">
          {smaData.map(({ period, values }, index) => (
            <IndicatorValue
              key={period}
              label={`SMA(${period})`}
              color={getSmaColor(index)}
              value={values.find(value => value.time === time)?.value}
            />
          ))}
          {bollingerEnabled && BOLLINGER_SERIES.map(({ key, label, color }) => (
            <IndicatorValue key={key} label={label} color={color} value={band?.[key]} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

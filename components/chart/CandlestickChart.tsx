"use client";

import { useMemo, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";
import { useIsCompactChart } from "@/hooks/useIsCompactChart";
import { IndicatorReadout } from "./IndicatorReadout";
import type { CandleResponse, Interval } from "@/lib/market-data";
import { formatPrice, formatVolume } from "@/lib/format-market-number";
import { SMA_PERIODS, calcSMA, calcBollingerBands } from "@/lib/indicators";
import { useCandlestickChart } from "./useCandlestickChart";

interface CandlestickChartProps {
  mobileIntervals?: ReactNode;
  readoutContainer?: HTMLElement | null;
  candles: CandleResponse[];
  interval: Interval;
  smaEnabled: boolean;
  bollingerEnabled: boolean;
}

export function CandlestickChart({ mobileIntervals, readoutContainer, candles, interval, smaEnabled, bollingerEnabled }: CandlestickChartProps) {
  const isCompact = useIsCompactChart();
  const sortedCandles = useMemo(() => [...candles].sort((a, b) => a.time.localeCompare(b.time)), [candles]);
  // ソートと指標計算はデータ変更時だけ行い、描画と数値表示で共有する。
  const closeData = useMemo(
    () => sortedCandles.map(candle => ({ time: candle.time, value: candle.close })),
    [sortedCandles],
  );
  const smaData = useMemo(
    () => smaEnabled && !isCompact && closeData.length > 0
      ? SMA_PERIODS[interval].map(period => ({ period, values: calcSMA(closeData, period) }))
      : [],
    [closeData, interval, smaEnabled, isCompact],
  );
  const bollingerData = useMemo(
    () => bollingerEnabled && !isCompact ? calcBollingerBands(closeData) : [],
    [closeData, bollingerEnabled, isCompact],
  );
  const bandByTime = useMemo(() => {
    const byTime = new Map<string, (typeof bollingerData)[number]>();
    bollingerData.forEach(band => {
      if (!byTime.has(band.time)) byTime.set(band.time, band);
    });
    return byTime;
  }, [bollingerData]);

  const {
    containerRef, displayedCandle, displayedIndex, selectedCandleExists,
    isPinned, isRangeModified, selectAdjacent, returnToLatest,
  } = useCandlestickChart({ sortedCandles, smaData, bollingerData, isCompact });
  const band = displayedCandle ? bandByTime.get(displayedCandle.time) : undefined;
  const formattedCandle = useMemo(() => displayedCandle && ({
    open: formatPrice(displayedCandle.open),
    high: formatPrice(displayedCandle.high),
    low: formatPrice(displayedCandle.low),
    close: formatPrice(displayedCandle.close),
    volume: formatVolume(displayedCandle.volume),
  }), [displayedCandle]);
  const candleDirectionColor = displayedCandle
    ? displayedCandle.close >= displayedCandle.open ? "var(--color-bull)" : "var(--color-bear)"
    : "var(--color-text-primary)";

  const intervalLabel = interval === "1day" ? "日足" : interval === "1week" ? "週足" : "月足";
  const volumeLabel = formattedCandle?.volume ?? "—";
  const volumeReadout = <span className="whitespace-nowrap tabular-nums text-[var(--color-text-muted)]">出来高 {volumeLabel}</span>;

  // One readout moves with the toolbar grid; selection state stays with the chart.
  const readout = (
    <div data-testid="candle-info" className={readoutContainer ? "pt-3 xl:pt-0" : "shrink-0 border-b border-[var(--color-border-subtle)] px-4 py-3 sm:px-6"}>
        {displayedCandle ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums">
                <span className={isCompact && mobileIntervals ? "sr-only" : "rounded-md bg-[var(--color-surface-3)] px-2 py-1 font-medium"}>{selectedCandleExists ? isPinned ? "固定中" : "選択中" : isCompact && mobileIntervals ? "最新" : "最新の足"}</span>
                <span className="font-medium">{displayedCandle.time.replaceAll("-", "/")}</span>
                {!isCompact && <span className="text-[var(--color-text-muted)]">{intervalLabel}</span>}
              </div>
              {isCompact && <div className="ml-auto flex shrink-0 items-center gap-1">{mobileIntervals}</div>}
              {!isCompact && <div className="hidden items-center gap-1 sm:flex">
                <button className="chart-action w-11 !px-0" type="button" aria-label="前の足を表示" disabled={displayedIndex <= 0} onClick={() => selectAdjacent(-1)}><ChevronLeft className="size-4" /></button>
                <button className="chart-action w-11 !px-0" type="button" aria-label="次の足を表示" disabled={displayedIndex < 0 || displayedIndex >= sortedCandles.length - 1} onClick={() => selectAdjacent(1)}><ChevronRight className="size-4" /></button>
                <button className="chart-action" type="button" onClick={returnToLatest} disabled={!selectedCandleExists && !isRangeModified} aria-label="最新の足と表示範囲に戻す"><RotateCcw className="size-3.5" aria-hidden="true" />最新へ</button>
              </div>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 min-[360px]:grid-cols-[1fr_1fr_1fr_1.4fr] sm:grid-cols-4">
              {([
                ["始値", formattedCandle?.open], ["高値", formattedCandle?.high],
                ["安値", formattedCandle?.low], isCompact ? ["出来高", volumeLabel] : ["終値", formattedCandle?.close],
              ] as const).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold tabular-nums sm:text-base" style={{ color: label === "終値" ? candleDirectionColor : "var(--color-text-primary)" }}>{value}</dd>
                </div>
              ))}
            </dl>
            {!isCompact && <div className="mt-2 flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2 py-1 text-xs text-[var(--color-text-muted)]">
              {volumeReadout}
              <div className="flex items-center gap-1 sm:ml-auto">
              <IndicatorReadout
                time={displayedCandle.time}
                intervalLabel={intervalLabel}
                smaEnabled={smaEnabled}
                bollingerEnabled={bollingerEnabled}
                smaData={smaData}
                band={band}
              />
              </div>
            </div>}
          </>
        ) : <span className="text-xs text-[var(--color-text-muted)]">4本値を取得中</span>}

      </div>
  );

  return (
    <div className="relative flex h-full w-full flex-col bg-[var(--color-surface-1)]">
      {readoutContainer ? createPortal(readout, readoutContainer) : readout}
      <div className="relative min-h-[180px] flex-1">
        <div ref={containerRef} className="absolute inset-0" aria-label={isCompact ? "ローソク足チャート。始値・高値・安値・出来高は最新の足を表示しています。" : "ローソク足チャート。カーソル移動で数値を表示。クリックで固定・解除。前後の足は上部のボタンでも選択できます。"} />
      </div>
    </div>
  );
}

import type { Interval } from "@/hooks/useSelectedSymbol";

export const SMA_PERIODS: Record<Interval, number[]> = {
  "1day": [5, 25, 75],
  "1week": [13, 26, 52],
  "1month": [9, 24, 60],
};

const SMA_COLOR_LIST = ["#2962ff", "#ff6d00", "#ab47bc"] as const;

export function getSmaColor(index: number): string {
  return SMA_COLOR_LIST[index % SMA_COLOR_LIST.length];
}

export function calcSMA(
  data: { time: string; value: number }[],
  period: number
): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].value;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

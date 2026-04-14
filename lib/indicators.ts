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
  if (period <= 0 || data.length < period) return [];

  const result: { time: string; value: number }[] = [];
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += data[i].value;
  }
  result.push({ time: data[period - 1].time, value: sum / period });

  for (let i = period; i < data.length; i++) {
    sum += data[i].value - data[i - period].value;
    result.push({ time: data[i].time, value: sum / period });
  }

  return result;
}

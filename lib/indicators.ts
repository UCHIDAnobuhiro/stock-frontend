import type { Interval } from "./market-data";

export const BOLLINGER_PERIOD = 20;

export type BollingerBandData = {
  time: string;
  middle: number;
  upper1: number;
  lower1: number;
  upper2: number;
  lower2: number;
  upper3: number;
  lower3: number;
};

export function calcBollingerBands(
  data: { time: string; value: number }[]
): BollingerBandData[] {
  const period = BOLLINGER_PERIOD;
  if (data.length < period) return [];

  const result: BollingerBandData[] = [];

  // 初期ウィンドウの sum / sumSq を構築
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].value;
    sumSq += data[i].value ** 2;
  }

  for (let i = period - 1; i < data.length; i++) {
    // i > period-1 のとき: 古い値を除いて新しい値を加える
    if (i > period - 1) {
      const outVal = data[i - period].value;
      const inVal = data[i].value;
      sum += inVal - outVal;
      sumSq += inVal ** 2 - outVal ** 2;
    }

    const mean = sum / period;
    // 浮動小数点誤差で負値になるケースを防ぐ
    const stdDev = Math.sqrt(Math.max(0, sumSq / period - mean ** 2));

    result.push({
      time: data[i].time,
      middle: mean,
      upper1: mean + stdDev,
      lower1: mean - stdDev,
      upper2: mean + 2 * stdDev,
      lower2: mean - 2 * stdDev,
      upper3: mean + 3 * stdDev,
      lower3: mean - 3 * stdDev,
    });
  }

  return result;
}

export const BOLLINGER_COLORS = {
  middle: "#f59e0b",
  sigma1: "#93c5fd",
  sigma2: "#60a5fa",
  sigma3: "#3b82f6",
} as const;

export type BollingerKey = Exclude<keyof BollingerBandData, "time">;

/** 描画する線と数値表示の順序・色・ラベルを揃える。 */
export const BOLLINGER_SERIES = [
  { key: "middle", label: `BB(${BOLLINGER_PERIOD})`, color: BOLLINGER_COLORS.middle },
  { key: "upper1", label: "+1σ", color: BOLLINGER_COLORS.sigma1 },
  { key: "lower1", label: "−1σ", color: BOLLINGER_COLORS.sigma1 },
  { key: "upper2", label: "+2σ", color: BOLLINGER_COLORS.sigma2 },
  { key: "lower2", label: "−2σ", color: BOLLINGER_COLORS.sigma2 },
  { key: "upper3", label: "+3σ", color: BOLLINGER_COLORS.sigma3 },
  { key: "lower3", label: "−3σ", color: BOLLINGER_COLORS.sigma3 },
] as const satisfies ReadonlyArray<{ key: BollingerKey; label: string; color: string }>;

export interface SmaSeriesData {
  period: number;
  values: { time: string; value: number }[];
}

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

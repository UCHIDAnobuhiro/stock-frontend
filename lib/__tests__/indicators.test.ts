import { describe, it, expect } from "vitest";
import { calcSMA, calcBollingerBands, BOLLINGER_PERIOD } from "@/lib/indicators";

/** 数値配列から { time, value } の系列を生成するヘルパー。time は "2024-01-01" からの連番文字列 */
function makeSeries(values: number[]): { time: string; value: number }[] {
  const base = new Date("2024-01-01T00:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return values.map((value, i) => ({
    time: new Date(base + i * dayMs).toISOString().slice(0, 10),
    value,
  }));
}

/** ウィンドウの単純平均を計算する（sliding window の結果検算用） */
function naiveMean(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/** ウィンドウの母標準偏差（÷N）を計算する（sliding window の結果検算用） */
function naiveStdDev(values: number[]): number {
  const mean = naiveMean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

describe("calcSMA", () => {
  it("既知数列 [1..5] を period=3 で計算すると [2, 3, 4] になる", () => {
    const data = makeSeries([1, 2, 3, 4, 5]);
    const result = calcSMA(data, 3);

    expect(result.map((r) => r.value)).toEqual([2, 3, 4]);
    // time は data[period-1] 以降に対応する
    expect(result.map((r) => r.time)).toEqual([
      data[2].time,
      data[3].time,
      data[4].time,
    ]);
  });

  it("data.length が period 未満のとき空配列を返す", () => {
    const data = makeSeries([1, 2]);
    expect(calcSMA(data, 3)).toEqual([]);
  });

  it("data.length === period のとき 1 要素だけ返り、値は全体平均になる", () => {
    const data = makeSeries([1, 2, 3, 4, 5]);
    const result = calcSMA(data, 5);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBeCloseTo(naiveMean([1, 2, 3, 4, 5]));
    expect(result[0].time).toBe(data[4].time);
  });

  it("period = 0 のとき空配列を返す", () => {
    const data = makeSeries([1, 2, 3]);
    expect(calcSMA(data, 0)).toEqual([]);
  });

  it("period が負のとき空配列を返す", () => {
    const data = makeSeries([1, 2, 3]);
    expect(calcSMA(data, -1)).toEqual([]);
  });

  it("返り値の time が入力の対応する要素の time と一致する", () => {
    const data = makeSeries([10, 20, 30, 40, 50, 60]);
    const result = calcSMA(data, 2);

    result.forEach((r, idx) => {
      // period=2 のとき、result[idx] は data[idx+1] に対応する
      expect(r.time).toBe(data[idx + 1].time);
    });
  });

  it("長めの系列でスライディングウィンドウの結果が素朴な平均と一致する", () => {
    // 固定値による疑似ランダム風の系列（50 要素）
    const values = Array.from({ length: 50 }, (_, i) =>
      100 + Math.sin(i * 0.37) * 20 + (i % 7) * 3
    );
    const data = makeSeries(values);
    const period = 5;
    const result = calcSMA(data, period);

    expect(result).toHaveLength(values.length - period + 1);
    result.forEach((r, idx) => {
      const window = values.slice(idx, idx + period);
      expect(r.value).toBeCloseTo(naiveMean(window));
      expect(r.time).toBe(data[idx + period - 1].time);
    });
  });
});

describe("calcBollingerBands", () => {
  it("20 点未満のとき空配列を返す", () => {
    const data = makeSeries(Array.from({ length: BOLLINGER_PERIOD - 1 }, (_, i) => i + 1));
    expect(calcBollingerBands(data)).toEqual([]);
  });

  it("ちょうど 20 点のとき 1 要素を返し、middle・stdDev・各バンドが手計算と一致する", () => {
    // 1..20 の連番: mean = 10.5, 母分散 = (20^2 - 1) / 12 = 33.25
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    const data = makeSeries(values);
    const result = calcBollingerBands(data);

    expect(result).toHaveLength(1);
    const band = result[0];
    const expectedMean = 10.5;
    const expectedStdDev = Math.sqrt(33.25);

    expect(band.middle).toBeCloseTo(expectedMean);
    expect(band.upper1).toBeCloseTo(expectedMean + expectedStdDev);
    expect(band.lower1).toBeCloseTo(expectedMean - expectedStdDev);
    expect(band.upper2).toBeCloseTo(expectedMean + 2 * expectedStdDev);
    expect(band.lower2).toBeCloseTo(expectedMean - 2 * expectedStdDev);
    expect(band.upper3).toBeCloseTo(expectedMean + 3 * expectedStdDev);
    expect(band.lower3).toBeCloseTo(expectedMean - 3 * expectedStdDev);
  });

  it("定数系列（全部同じ値）のとき stdDev = 0 で全バンドが middle と一致する", () => {
    const values = Array.from({ length: 25 }, () => 100);
    const data = makeSeries(values);
    const result = calcBollingerBands(data);

    result.forEach((band) => {
      expect(band.middle).toBeCloseTo(100);
      expect(band.upper1).toBeCloseTo(band.middle);
      expect(band.lower1).toBeCloseTo(band.middle);
      expect(band.upper2).toBeCloseTo(band.middle);
      expect(band.lower2).toBeCloseTo(band.middle);
      expect(band.upper3).toBeCloseTo(band.middle);
      expect(band.lower3).toBeCloseTo(band.middle);
    });
  });

  it("バンドが middle を中心に対称であり、シグマの倍数関係が成り立つ", () => {
    const values = Array.from({ length: 30 }, (_, i) =>
      50 + Math.sin(i * 0.21) * 15 + (i % 5)
    );
    const data = makeSeries(values);
    const result = calcBollingerBands(data);

    result.forEach((band) => {
      const sigma1 = band.upper1 - band.middle;

      expect(band.upper1 - band.middle).toBeCloseTo(band.middle - band.lower1);
      expect(band.upper2 - band.middle).toBeCloseTo(band.middle - band.lower2);
      expect(band.upper3 - band.middle).toBeCloseTo(band.middle - band.lower3);

      expect(band.upper2 - band.middle).toBeCloseTo(2 * sigma1);
      expect(band.upper3 - band.middle).toBeCloseTo(3 * sigma1);
    });
  });

  it("大きなオフセットを持つ系列でも素朴な再計算と一致し、stdDev は常に 0 以上になる", () => {
    // 1e6 前後の値を 30 個生成
    const values = Array.from({ length: 30 }, (_, i) =>
      1_000_000 + Math.sin(i * 0.5) * 10 + i
    );
    const data = makeSeries(values);
    const result = calcBollingerBands(data);

    expect(result).toHaveLength(values.length - BOLLINGER_PERIOD + 1);

    result.forEach((band, idx) => {
      const window = values.slice(idx, idx + BOLLINGER_PERIOD);
      const expectedMean = naiveMean(window);
      const expectedStdDev = naiveStdDev(window);
      const stdDev = band.upper1 - band.middle;

      expect(band.middle).toBeCloseTo(expectedMean, 6);
      // stdDev は sum of squares 方式で計算されるため、大きなオフセット時は桁落ちが生じうる。
      // 誤差の性質を踏まえ、有効な精度（小数点以下 3 桁）で比較する
      expect(stdDev).toBeCloseTo(expectedStdDev, 3);
      // 浮動小数点誤差ガード（Math.max(0, ...)）の検証: stdDev は常に 0 以上
      expect(stdDev).toBeGreaterThanOrEqual(0);
    });
  });

  it("返り値の time がウィンドウ末尾の要素の time と一致する", () => {
    const values = Array.from({ length: 25 }, (_, i) => i + 1);
    const data = makeSeries(values);
    const result = calcBollingerBands(data);

    result.forEach((band, idx) => {
      expect(band.time).toBe(data[idx + BOLLINGER_PERIOD - 1].time);
    });
  });
});

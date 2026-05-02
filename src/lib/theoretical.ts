import type { BenchmarkPoint } from '../types';

export type TheoryKey = 'On' | 'Onlogn' | 'On2';

const theoryFns: Record<TheoryKey, (n: number) => number> = {
  On: (n) => Math.max(1, n),
  Onlogn: (n) => (n <= 1 ? 1 : n * Math.log2(n)),
  On2: (n) => n * n,
};

/**
 * Scale theoretical curves to sit near measured times for chart overlay.
 * Uses least squares: time ≈ scale * f(n).
 */
export function scaledTheorySeries(
  points: BenchmarkPoint[],
  keys: TheoryKey[] = ['On', 'Onlogn', 'On2']
): Record<TheoryKey, { n: number; y: number }[]> {
  const out: Record<TheoryKey, { n: number; y: number }[]> = {
    On: [],
    Onlogn: [],
    On2: [],
  };
  if (!points.length) return out;

  for (const key of keys) {
    const g = theoryFns[key];
    const xs = points.map((p) => g(Math.max(p.n, 1)));
    const ys = points.map((p) => p.timeMs);
    const sumXX = xs.reduce((s, x) => s + x * x, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const scale = sumXX > 0 ? sumXY / sumXX : 0;
    out[key] = points.map((p) => ({
      n: p.n,
      y: scale * g(Math.max(p.n, 1)),
    }));
  }
  return out;
}

export const theoryLabels: Record<TheoryKey, string> = {
  On: 'O(n) (scaled)',
  Onlogn: 'O(n log n) (scaled)',
  On2: 'O(n²) (scaled)',
};

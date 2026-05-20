import type { ComplexityEstimate } from '../types';

type Family = 'O(n)' | 'O(n log n)' | 'O(n²)';

function fN(n: number): number {
  return Math.max(n, 1);
}

function fNLogN(n: number): number {
  return n <= 1 ? 1 : n * Math.log2(n);
}

function fN2(n: number): number {
  return n * n;
}

/**
 * Least-squares fit: time ≈ a * g(n). Returns sum of squared residuals for family.
 */
function residualSum(
  points: { n: number; timeMs: number }[],
  g: (n: number) => number
): number {
  const xs = points.map((p) => g(Math.max(p.n, 1)));
  const ys = points.map((p) => p.timeMs);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  
  if (sumXX === 0) return Number.POSITIVE_INFINITY;
  
  const a = sumXY / sumXX;
  
  // FIX: Changed 'p' to '_' to resolve the TS6133 unused variable error
  return points.reduce((acc, _, i) => {
    const pred = a * xs[i];
    const d = ys[i] - pred;
    return acc + d * d;
  }, 0);
}

/** Client-side complexity estimation (mirrors backend logic). */
export function estimateComplexityLocal(
  points: { n: number; timeMs: number }[]
): ComplexityEstimate {
  const filtered = points.filter((p) => p.n > 0 && Number.isFinite(p.timeMs));
  if (filtered.length < 3) {
    return {
      label: 'O(n)',
      score: 0,
      residuals: { 'O(n)': 0, 'O(n log n)': 0, 'O(n²)': 0 },
    };
  }

  const families: { label: Family; g: (n: number) => number }[] = [
    { label: 'O(n)', g: fN },
    { label: 'O(n log n)', g: fNLogN },
    { label: 'O(n²)', g: fN2 },
  ];

  let best: Family = 'O(n)';
  let bestRes = Number.POSITIVE_INFINITY;
  const residuals: Record<Family, number> = {
    'O(n)': 0,
    'O(n log n)': 0,
    'O(n²)': 0,
  };

  for (const { label, g } of families) {
    const r = residualSum(filtered, g);
    residuals[label] = r;
    if (r < bestRes) {
      bestRes = r;
      best = label;
    }
  }

  const total = filtered.reduce((s, p) => s + p.timeMs * p.timeMs, 0) || 1;
  const score = Math.max(0, 1 - bestRes / total);

  return { label: best, score, residuals };


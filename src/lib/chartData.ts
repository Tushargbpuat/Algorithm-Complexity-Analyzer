import { scaledTheorySeries, type TheoryKey } from './theoretical';
import type { BenchmarkSeries } from '../types';

const EPS = 1e-9;

export const THEORY_KEYS: TheoryKey[] = ['On', 'Onlogn', 'On2'];

export type BenchmarkChartRow = Record<string, string | number | undefined>;

/**
 * Aligns every algorithm series on the same n values (union of all sample sizes).
 * Theoretical reference curves are indexed from the primary (first) series only.
 */
export function mergeBenchmarkSeriesToRows(
  series: BenchmarkSeries[],
  metric: 'timeMs' | 'comparisons' | 'swaps',
  showTheory: boolean
): BenchmarkChartRow[] {
  if (!series.length) return [];

  const ns = [...new Set(series.flatMap((s) => s.points.map((p) => p.n)))].sort((a, b) => a - b);

  const lookups = series.map((s) => new Map(s.points.map((p) => [p.n, p])));

  const primarySorted = [...series[0].points].sort((a, b) => a.n - b.n);
  const primaryIndexByN = new Map(primarySorted.map((p, i) => [p.n, i]));

  const scaledTheory =
    showTheory && metric === 'timeMs' && primarySorted.length > 0
      ? scaledTheorySeries(primarySorted)
      : null;

  return ns.map((n) => {
    const row: BenchmarkChartRow = { n };

    for (let i = 0; i < series.length; i++) {
      const pt = lookups[i].get(n);
      const raw = pt?.[metric];
      const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
      row[series[i].algorithm] = v !== null && v > 0 ? v : EPS;
    }

    if (scaledTheory) {
      const ti = primaryIndexByN.get(n);
      if (ti !== undefined) {
        for (const k of THEORY_KEYS) {
          const y = scaledTheory[k][ti]?.y ?? 0;
          row[k] = y > 0 ? y : EPS;
        }
      }
    }

    return row;
  });
}

export const METRIC_LABELS: Record<'timeMs' | 'comparisons' | 'swaps', string> = {
  timeMs: 'Time (ms)',
  comparisons: 'Comparisons',
  swaps: 'Swaps',
};

export function formatChartValue(metric: keyof typeof METRIC_LABELS, v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (metric === 'timeMs') {
    if (v < 0.01) return v.toExponential(2);
    if (v < 10) return v.toFixed(4);
    return v.toFixed(2);
  }
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}k`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

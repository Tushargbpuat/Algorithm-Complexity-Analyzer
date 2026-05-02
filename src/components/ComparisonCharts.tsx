import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ALL_ALGORITHMS, ALGORITHM_LABELS, CHART_COLORS } from '../constants';
import { formatChartValue, METRIC_LABELS } from '../lib/chartData';
import type { AlgorithmId, RunResult } from '../types';

function colorForAlgorithm(id: AlgorithmId): string {
  const idx = ALL_ALGORITHMS.indexOf(id);
  const i = idx >= 0 ? idx : 0;
  return CHART_COLORS[i % CHART_COLORS.length] ?? '#94a3b8';
}

/** Bar charts for a single comparison run (same n, multiple algorithms). */
export function ComparisonCharts({ results }: { results: RunResult[] }) {
  const byTime = [...results].sort((a, b) => a.timeMs - b.timeMs);
  const byComparisons = [...results].sort((a, b) => b.comparisons - a.comparisons);

  const timeRows = byTime.map((r) => ({
    id: r.algorithm,
    label: shortenLabel(r.algorithm, byTime.length),
    timeMs: Math.max(r.timeMs, 1e-9),
    fullName: ALGORITHM_LABELS[r.algorithm],
    color: colorForAlgorithm(r.algorithm),
  }));

  const cmpRows = byComparisons.map((r) => ({
    id: r.algorithm,
    label: shortenLabel(r.algorithm, byComparisons.length),
    comparisons: Math.max(r.comparisons, 1),
    fullName: ALGORITHM_LABELS[r.algorithm],
    color: colorForAlgorithm(r.algorithm),
  }));

  const swapRows = [...results]
    .filter((r) => r.swaps > 0)
    .sort((a, b) => b.swaps - a.swaps)
    .map((r) => ({
      id: r.algorithm,
      label: shortenLabel(r.algorithm, results.length),
      swaps: Math.max(r.swaps, 1),
      fullName: ALGORITHM_LABELS[r.algorithm],
      color: colorForAlgorithm(r.algorithm),
    }));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Runtime (lower is better)
        </h3>
        <p className="mb-3 text-xs text-slate-500">Same input, sorted by elapsed time.</p>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={timeRows}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis
                type="number"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(v) => formatChartValue('timeMs', v)}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={88}
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip content={<CmpTooltip metric="timeMs" />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="timeMs" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {timeRows.map((e) => (
                  <Cell key={e.id} fill={e.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Comparison operations
        </h3>
        <p className="mb-3 text-xs text-slate-500">Empirical probe count on this dataset.</p>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cmpRows} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={56}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={56}
                tickFormatter={(v) => formatChartValue('comparisons', v)}
              />
              <Tooltip content={<CmpTooltip metric="comparisons" />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="comparisons" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {cmpRows.map((e) => (
                  <Cell key={e.id} fill={e.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {swapRows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Swaps / writes</h3>
          <p className="mb-3 text-xs text-slate-500">
            Search modes usually record zero swaps; this highlights sorting cost when present.
          </p>
          <div className="h-56 w-full min-w-0 max-w-3xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={swapRows} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  width={52}
                  tickFormatter={(v) => formatChartValue('swaps', v)}
                />
                <Tooltip content={<CmpTooltip metric="swaps" />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="swaps" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {swapRows.map((e) => (
                    <Cell key={e.id} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function shortenLabel(id: AlgorithmId, total: number): string {
  const short: Record<AlgorithmId, string> = {
    bubbleSort: 'Bubble',
    selectionSort: 'Select',
    mergeSort: 'Merge',
    quickSort: 'Quick',
    heapSort: 'Heap',
    linearSearch: 'Linear',
    binarySearch: 'Binary',
  };
  const s = short[id];
  return total > 5 ? s : ALGORITHM_LABELS[id];
}

function CmpTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown>; color?: string }>;
  metric: keyof typeof METRIC_LABELS;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Record<string, unknown>;
  const name = String(row.fullName ?? row.label ?? '');
  let val = 0;
  if (metric === 'timeMs') val = Number(row.timeMs);
  else if (metric === 'comparisons') val = Number(row.comparisons);
  else val = Number(row.swaps);

  return (
    <div className="rounded-lg border border-slate-600 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-slate-100">{name}</div>
      <div className="mt-1 font-mono text-cyan-300">
        {METRIC_LABELS[metric]}: {formatChartValue(metric, val)}
      </div>
    </div>
  );
}

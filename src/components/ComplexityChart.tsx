import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ALGORITHM_LABELS, CHART_COLORS } from '../constants';
import {
  METRIC_LABELS,
  THEORY_KEYS,
  formatChartValue,
  mergeBenchmarkSeriesToRows,
} from '../lib/chartData';
import { theoryLabels, type TheoryKey } from '../lib/theoretical';
import type { BenchmarkSeries } from '../types';

interface Props {
  series: BenchmarkSeries[];
  metric: 'timeMs' | 'comparisons' | 'swaps';
  showTheory: boolean;
  axisScale: 'log' | 'linear';
}

export function ComplexityChart({ series, metric, showTheory, axisScale }: Props) {
  const rows = mergeBenchmarkSeriesToRows(series, metric, showTheory);

  const gridStroke = '#64748b66';
  const tickFill = '#94a3b8';

  return (
    <div className="h-[min(420px,55vh)] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            dataKey="n"
            type="number"
            scale={axisScale}
            domain={['auto', 'auto']}
            stroke={tickFill}
            tick={{ fill: tickFill, fontSize: 11 }}
            label={{
              value: 'Input size n',
              position: 'insideBottom',
              offset: -4,
              fill: tickFill,
              fontSize: 11,
            }}
            tickFormatter={(v) =>
              typeof v === 'number' && v >= 10000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <YAxis
            scale={axisScale}
            domain={axisScale === 'log' ? ['auto', 'auto'] : ([0, 'auto'] as const)}
            stroke={tickFill}
            tick={{ fill: tickFill, fontSize: 11 }}
            width={metric === 'timeMs' ? 56 : 64}
            tickFormatter={(v) =>
              typeof v === 'number' ? formatChartValue(metric, v as number) : String(v)
            }
            label={{
              value: METRIC_LABELS[metric],
              angle: -90,
              position: 'insideLeft',
              fill: tickFill,
              fontSize: 11,
              style: { textAnchor: 'middle' },
            }}
          />
          <Tooltip
            content={(props) => <BenchmarkTooltip {...props} metric={metric} />}
            cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: 8 }} />
          {series.map((s, i) => (
            <Line
              key={s.algorithm}
              type="monotone"
              dataKey={s.algorithm}
              name={ALGORITHM_LABELS[s.algorithm]}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
          {showTheory &&
            metric === 'timeMs' &&
            THEORY_KEYS.map((k: TheoryKey) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={theoryLabels[k]}
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipPayloadEntry {
  dataKey?: string | number;
  name?: string;
  value?: number;
  color?: string;
  payload?: Record<string, unknown>;
}

function BenchmarkTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  metric: keyof typeof METRIC_LABELS;
}) {
  if (!active || !payload?.length) return null;

  const nVal = payload[0]?.payload?.n;
  const nLabel = typeof nVal === 'number' ? nVal.toLocaleString() : String(nVal ?? '');

  const rows = [...payload].sort((a, b) => {
    const av = typeof a.value === 'number' ? a.value : 0;
    const bv = typeof b.value === 'number' ? b.value : 0;
    const aTheory = THEORY_KEYS.includes(String(a.dataKey) as TheoryKey);
    const bTheory = THEORY_KEYS.includes(String(b.dataKey) as TheoryKey);
    if (aTheory !== bTheory) return aTheory ? 1 : -1;
    return bv - av;
  });

  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-600 bg-slate-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-2 border-b border-slate-700 pb-2 font-semibold text-slate-100">
        n = {nLabel}
      </div>
      <ul className="space-y-1">
        {rows.map((item) => {
          const key = String(item.dataKey ?? item.name ?? '');
          const isTheory = THEORY_KEYS.includes(key as TheoryKey);
          const label = isTheory ? theoryLabels[key as TheoryKey] : String(item.name ?? key);
          const v = typeof item.value === 'number' ? item.value : Number(item.value);
          return (
            <li key={key + label} className="flex justify-between gap-6 font-mono">
              <span style={{ color: item.color }}>{label}</span>
              <span className="text-slate-200">{formatChartValue(metric, v)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { toPng } from 'html-to-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ALL_ALGORITHMS,
  ALGORITHM_LABELS,
  ALGORITHM_THEORY,
  SEARCH_ALGORITHMS,
  SORT_ALGORITHMS,
} from './constants';
import { useDarkMode } from './hooks/useDarkMode';
import { useRunHistory } from './hooks/useHistory';
import { parseNumberArray, randomIntArray, formatArrayPreview } from './lib/arrayUtils';
import { estimateComplexityLocal } from './lib/complexityFit';
import { runBenchmarkSeries } from './services/benchmarkRun';
import { estimateFromPoints } from './services/estimateRun';
import { runCompareMany } from './services/singleRun';
import type { AlgorithmId, BenchmarkSeries, RunResult } from './types';
import { ComparisonCharts } from './components/ComparisonCharts';
import { ComplexityChart } from './components/ComplexityChart';
import { SortVisualizer } from './components/SortVisualizer';

function toggleInSet<T>(set: Set<T>, v: T): Set<T> {
  const n = new Set(set);
  if (n.has(v)) n.delete(v);
  else n.add(v);
  return n;
}

const MIN_ARRAY_N = 10;
const MAX_ARRAY_N = 100_000;

function geometricSizes(count: number, min: number, max: number): number[] {
  if (count < 2) return [Math.min(max, Math.max(min, 10))];
  const ratio = Math.pow(max / min, 1 / (count - 1));
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(Math.round(min * Math.pow(ratio, i)));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

export default function App() {
  const [dark, toggleDark] = useDarkMode();
  const { entries, push, clear, leaderboard } = useRunHistory();

  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const [inputText, setInputText] = useState('42, 17, 9, 88, 55, 31, 64');
  const [arraySize, setArraySize] = useState(60);
  const [arraySizeInput, setArraySizeInput] = useState('60');
  const [randomSeed, setRandomSeed] = useState(1337);
  const [searchTarget, setSearchTarget] = useState(42);

  const [selected, setSelected] = useState<Set<AlgorithmId>>(
    () => new Set<AlgorithmId>(['mergeSort', 'quickSort', 'bubbleSort'])
  );

  const [compareResults, setCompareResults] = useState<RunResult[] | null>(null);
  const [compareBusy, setCompareBusy] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const [benchAlgorithms, setBenchAlgorithms] = useState<Set<AlgorithmId>>(
    () => new Set<AlgorithmId>(['mergeSort', 'quickSort', 'bubbleSort'])
  );
  const [benchSizes, setBenchSizes] = useState('10,30,100,300,1000,3000');
  const [benchSeed, setBenchSeed] = useState(4242);
  const [benchSeries, setBenchSeries] = useState<BenchmarkSeries[] | null>(null);
  const [benchSource, setBenchSource] = useState<'server' | 'browser' | null>(null);
  const [benchBusy, setBenchBusy] = useState(false);
  const [benchError, setBenchError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'timeMs' | 'comparisons' | 'swaps'>('timeMs');
  const [chartAxisScale, setChartAxisScale] = useState<'log' | 'linear'>('log');
  const [showTheory, setShowTheory] = useState(true);

  const [vizAlgorithm, setVizAlgorithm] = useState<AlgorithmId>('mergeSort');
  const chartRef = useRef<HTMLDivElement>(null);

  const [estimate, setEstimate] = useState<{
    label: string;
    score: number;
    source: 'server' | 'browser';
  } | null>(null);

  const parsedArray = useMemo(() => {
    try {
      return parseNumberArray(inputText);
    } catch {
      return null;
    }
  }, [inputText]);

  const vizValues = useMemo(() => {
    if (!parsedArray?.length) return [];
    return parsedArray;
  }, [parsedArray]);

  useEffect(() => {
    import('./api/client').then(({ apiHealth }) => {
      apiHealth().then(setServerUp);
    });
  }, []);

  useEffect(() => {
    setArraySizeInput(String(arraySize));
  }, [arraySize]);

  const commitArraySizeInput = useCallback((): number => {
    const v = parseInt(arraySizeInput.trim(), 10);
    if (!Number.isFinite(v)) {
      setArraySizeInput(String(arraySize));
      return arraySize;
    }
    const clamped = Math.min(MAX_ARRAY_N, Math.max(MIN_ARRAY_N, v));
    setArraySize(clamped);
    setArraySizeInput(String(clamped));
    return clamped;
  }, [arraySizeInput, arraySize]);

  const applyRandom = useCallback(() => {
    const n = commitArraySizeInput();
    const arr = randomIntArray(n, randomSeed);
    setInputText(arr.join(', '));
  }, [commitArraySizeInput, randomSeed]);

  const runComparison = useCallback(async () => {
    if (!parsedArray?.length) {
      setCompareError('Enter a valid numeric array.');
      return;
    }
    const list = [...selected];
    if (!list.length) {
      setCompareError('Select at least one algorithm.');
      return;
    }
    setCompareBusy(true);
    setCompareError(null);
    try {
      const results = await runCompareMany(list, parsedArray, searchTarget);
      setCompareResults(results);
      push(list, results);
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : 'Comparison failed');
    } finally {
      setCompareBusy(false);
    }
  }, [parsedArray, selected, push, searchTarget]);

  const runBenchmark = useCallback(async () => {
    const sizes = benchSizes
      .split(/[\s,;]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n >= 1);
    const algos = [...benchAlgorithms];
    if (!sizes.length || !algos.length) {
      setBenchError('Provide valid sizes and at least one algorithm.');
      return;
    }
    setBenchBusy(true);
    setBenchError(null);
    try {
      const { series, source } = await runBenchmarkSeries(algos, sizes, benchSeed);
      setBenchSeries(series);
      setBenchSource(source);
      const primary = series[0];
      if (primary?.points?.length) {
        const pts = primary.points.map((p) => ({ n: p.n, timeMs: p.timeMs }));
        const { estimate: est, source: estSrc } = await estimateFromPoints(pts);
        setEstimate({
          label: est.label,
          score: est.score,
          source: estSrc,
        });
      }
    } catch (e) {
      setBenchError(e instanceof Error ? e.message : 'Benchmark failed');
    } finally {
      setBenchBusy(false);
    }
  }, [benchAlgorithms, benchSizes, benchSeed]);

  const localEstimatePreview = useMemo(() => {
    if (!benchSeries?.[0]?.points?.length) return null;
    return estimateComplexityLocal(
      benchSeries[0].points.map((p) => ({ n: p.n, timeMs: p.timeMs }))
    );
  }, [benchSeries]);

  const exportChart = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `complexity-chart-${Date.now()}.png`;
      a.click();
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="min-h-screen bg-[rgb(var(--surface))] text-slate-900 transition-colors dark:text-slate-100">
      <style>{`
        :root {
          --surface: 248 250 252;
          --surface-muted: 241 245 249;
        }
        .dark {
          --surface: 15 23 42;
          --surface-muted: 30 41 59;
        }
      `}</style>

      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Algorithm Time Complexity Analyzer
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Measure runtime and operations, compare algorithms, and relate empirical curves to
              classical bounds.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                serverUp
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : serverUp === false
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
                    : 'bg-slate-500/15 text-slate-600'
              }`}
            >
              API: {serverUp === null ? '…' : serverUp ? 'connected' : 'offline (local fallback)'}
            </span>
            <button
              type="button"
              onClick={toggleDark}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {dark ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Input</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Comma or whitespace separated numbers. For search modes, set the target below.
          </p>

          <textarea
            className="mt-4 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Array size n ({MIN_ARRAY_N.toLocaleString()}–{MAX_ARRAY_N.toLocaleString()})
              </label>
              <input
                type="range"
                min={MIN_ARRAY_N}
                max={MAX_ARRAY_N}
                step={10}
                value={arraySize}
                onChange={(e) => setArraySize(Number(e.target.value))}
                className="mt-2 w-full"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label htmlFor="array-size-n" className="sr-only">
                  Array size n
                </label>
                <span className="font-mono text-sm text-slate-600 dark:text-slate-400">n =</span>
                <input
                  id="array-size-n"
                  type="number"
                  min={MIN_ARRAY_N}
                  max={MAX_ARRAY_N}
                  value={arraySizeInput}
                  onChange={(e) => setArraySizeInput(e.target.value)}
                  onBlur={commitArraySizeInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                PRNG seed
              </label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={applyRandom}
                className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500"
              >
                Generate random array
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Search target (linear / binary)
            </label>
            <input
              type="number"
              value={searchTarget}
              onChange={(e) => setSearchTarget(Number(e.target.value))}
              className="mt-2 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-950"
            />
          </div>

          {parsedArray && (
            <p className="mt-3 font-mono text-xs text-slate-500">
              Preview: {formatArrayPreview(parsedArray)}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Comparison mode</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Select multiple algorithms and run them on the same input (server API or browser
            timing).
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {ALL_ALGORITHMS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelected((s) => toggleInSet(s, id))}
                title={ALGORITHM_THEORY[id]}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  selected.has(id)
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:text-cyan-100'
                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300'
                }`}
              >
                {ALGORITHM_LABELS[id]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={runComparison}
            disabled={compareBusy}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-50"
          >
            {compareBusy ? 'Running…' : 'Run comparison'}
          </button>
          {compareError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{compareError}</p>
          )}

          {compareResults && (
            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Numeric results</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
                      <th className="px-3 py-2">Algorithm</th>
                      <th className="px-3 py-2">Time (ms)</th>
                      <th className="px-3 py-2">Comparisons</th>
                      <th className="px-3 py-2">Swaps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareResults.map((r) => (
                      <tr
                        key={r.algorithm}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-3 py-2 font-medium">{ALGORITHM_LABELS[r.algorithm]}</td>
                        <td className="px-3 py-2 font-mono">{r.timeMs.toFixed(4)}</td>
                        <td className="px-3 py-2 font-mono">{r.comparisons.toLocaleString()}</td>
                        <td className="px-3 py-2 font-mono">{r.swaps.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ComparisonCharts results={compareResults} />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Benchmark & complexity chart</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Sweep input sizes across algorithms. Toggle linear axes when ranges are narrow;
                dashed curves show scaled theoretical shapes matched to the primary series.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                Source: {benchSource ?? '—'}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {ALL_ALGORITHMS.map((id) => (
              <button
                key={`bench-${id}`}
                type="button"
                onClick={() => setBenchAlgorithms((s) => toggleInSet(s, id))}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  benchAlgorithms.has(id)
                    ? 'border-violet-500 bg-violet-500/15 text-violet-800 dark:text-violet-100'
                    : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-950'
                }`}
              >
                {ALGORITHM_LABELS[id]}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-500">Sizes (comma-separated)</label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 p-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-950"
                value={benchSizes}
                onChange={(e) => setBenchSizes(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-xs text-cyan-600 hover:underline dark:text-cyan-400"
                  onClick={() =>
                    setBenchSizes(geometricSizes(8, 20, 50000).join(','))
                  }
                >
                  Preset: geometric 20 → 50k
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Benchmark seed</label>
              <input
                type="number"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-950"
                value={benchSeed}
                onChange={(e) => setBenchSeed(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runBenchmark}
              disabled={benchBusy}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-cyan-600 dark:hover:bg-cyan-500"
            >
              {benchBusy ? 'Benchmarking…' : 'Run benchmark'}
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showTheory}
                onChange={(e) => setShowTheory(e.target.checked)}
              />
              Show scaled O(n), O(n log n), O(n²)
            </label>
            <select
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-950"
              value={chartMetric}
              onChange={(e) => setChartMetric(e.target.value as typeof chartMetric)}
            >
              <option value="timeMs">Time (ms)</option>
              <option value="comparisons">Comparisons</option>
              <option value="swaps">Swaps</option>
            </select>
            <select
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-950"
              value={chartAxisScale}
              onChange={(e) => setChartAxisScale(e.target.value as 'log' | 'linear')}
              aria-label="Chart axis scale"
            >
              <option value="log">Log–log axes</option>
              <option value="linear">Linear axes</option>
            </select>
            <button
              type="button"
              onClick={exportChart}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
            >
              Export chart PNG
            </button>
          </div>
          {benchError && <p className="mt-2 text-sm text-red-600">{benchError}</p>}

          {estimate && (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
              <div className="font-semibold text-emerald-900 dark:text-emerald-100">
                Estimated complexity (from first series, time vs n): {estimate.label}
              </div>
              <div className="mt-1 text-emerald-800/90 dark:text-emerald-200/90">
                Confidence score: {(estimate.score * 100).toFixed(1)}% · via {estimate.source}
              </div>
              {localEstimatePreview && (
                <div className="mt-2 font-mono text-xs text-emerald-900/80 dark:text-emerald-200/80">
                  Residuals — O(n): {localEstimatePreview.residuals['O(n)'].toExponential(2)}, O(n log
                  n): {localEstimatePreview.residuals['O(n log n)'].toExponential(2)}, O(n²):{' '}
                  {localEstimatePreview.residuals['O(n²)'].toExponential(2)}
                </div>
              )}
            </div>
          )}

          <div ref={chartRef} className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
            {benchSeries && benchSeries.length > 0 ? (
              <ComplexityChart
                series={benchSeries}
                metric={chartMetric}
                showTheory={showTheory}
                axisScale={chartAxisScale}
              />
            ) : (
              <div className="flex h-[min(420px,55vh)] items-center justify-center text-sm text-slate-500">
                Run a benchmark to plot curves.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Step-by-step visualization</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Client-side trace with play/pause. Sorting shows compares and swaps; search highlights
            probes.
          </p>
          <div className="mt-4">
            <label className="text-xs font-medium text-slate-500">Algorithm</label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-950"
              value={vizAlgorithm}
              onChange={(e) => setVizAlgorithm(e.target.value as AlgorithmId)}
            >
              <optgroup label="Sorting">
                {SORT_ALGORITHMS.map((id) => (
                  <option key={id} value={id}>
                    {ALGORITHM_LABELS[id]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Searching">
                {SEARCH_ALGORITHMS.map((id) => (
                  <option key={id} value={id}>
                    {ALGORITHM_LABELS[id]}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="mt-6">
            <SortVisualizer algorithm={vizAlgorithm} values={vizValues} searchTarget={searchTarget} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">History & leaderboard</h2>
            <button
              type="button"
              onClick={clear}
              className="text-xs text-red-600 hover:underline dark:text-red-400"
            >
              Clear
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Session persistence via localStorage. Leaderboard counts fastest runs per comparison batch.
          </p>
          {leaderboard.length > 0 && (
            <ol className="mt-4 space-y-2 text-sm">
              {leaderboard.map((row) => (
                <li key={row.algorithm} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/80">
                  <span>{ALGORITHM_LABELS[row.algorithm]}</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400">{row.count} wins</span>
                </li>
              ))}
            </ol>
          )}
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto text-xs text-slate-600 dark:text-slate-400">
            {entries.slice(0, 12).map((e) => (
              <li key={e.id} className="border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="font-mono text-slate-500">
                  {new Date(e.at).toLocaleString()}
                </span>{' '}
                · n={e.n}{' '}
                {e.winner ? (
                  <>
                    · fastest:{' '}
                    <span className="text-cyan-600 dark:text-cyan-400">
                      {ALGORITHM_LABELS[e.winner]}
                    </span>
                  </>
                ) : null}
              </li>
            ))}
            {!entries.length && <li className="text-slate-500">No runs yet.</li>}
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
        Built with React, Tailwind, Recharts · Proxy <code className="rounded bg-slate-100 px-1 dark:bg-slate-900">/api</code>{' '}
        → backend or browser fallback.
      </footer>
    </div>
  );
}

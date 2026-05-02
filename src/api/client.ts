import type { AlgorithmId, BenchmarkSeries, ComplexityEstimate, RunResult } from '../types';

const base = () => import.meta.env.VITE_API_BASE ?? '';

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(res.ok ? 'Empty response' : `Request failed (${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON from server');
  }
}

/** POST /api/run — single algorithm execution */
export async function apiRun(
  algorithm: AlgorithmId,
  input: number[],
  searchTarget?: number
): Promise<RunResult> {
  const res = await fetch(`${base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ algorithm, input, searchTarget }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Run failed (${res.status})`);
  }
  return parseJson<RunResult>(res);
}

/** POST /api/compare — same dataset, multiple algorithms */
export async function apiCompare(
  algorithms: AlgorithmId[],
  input: number[],
  searchTarget?: number
): Promise<RunResult[]> {
  const res = await fetch(`${base}/api/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ algorithms, input, searchTarget }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Compare failed (${res.status})`);
  }
  const data = await parseJson<{ results: RunResult[] }>(res);
  return data.results;
}

/** POST /api/benchmark — sweep input sizes (server-side timing) */
export async function apiBenchmark(
  algorithms: AlgorithmId[],
  sizes: number[],
  seed?: number
): Promise<BenchmarkSeries[]> {
  const res = await fetch(`${base}/api/benchmark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ algorithms, sizes, seed }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Benchmark failed (${res.status})`);
  }
  const data = await parseJson<{ series: BenchmarkSeries[] }>(res);
  return data.series;
}

/** POST /api/estimate-complexity — fit complexity from (n, timeMs) points */
export async function apiEstimateComplexity(
  points: { n: number; timeMs: number }[]
): Promise<ComplexityEstimate> {
  const res = await fetch(`${base}/api/estimate-complexity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Estimate failed (${res.status})`);
  }
  return parseJson<ComplexityEstimate>(res);
}

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${base}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

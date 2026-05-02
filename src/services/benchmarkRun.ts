import { apiBenchmark } from '../api/client';
import { randomIntArray } from '../lib/arrayUtils';
import { runTimed } from '../lib/timedAlgorithms';
import type { AlgorithmId, BenchmarkSeries } from '../types';

/**
 * Attempts server-side benchmark; falls back to in-browser timing
 * (same PRNG seed per size for fair comparison across algorithms).
 */
export async function runBenchmarkSeries(
  algorithms: AlgorithmId[],
  sizes: number[],
  seed: number
): Promise<{ series: BenchmarkSeries[]; source: 'server' | 'browser' }> {
  try {
    const series = await apiBenchmark(algorithms, sizes, seed);
    return { series, source: 'server' };
  } catch {
    const series: BenchmarkSeries[] = algorithms.map((algorithm) => ({
      algorithm,
      points: sizes.map((n) => {
        const input = randomIntArray(n, seed + n * 31);
        const m = runTimed(algorithm, input);
        return {
          n,
          timeMs: m.timeMs,
          comparisons: m.comparisons,
          swaps: m.swaps,
        };
      }),
    }));
    return { series, source: 'browser' };
  }
}

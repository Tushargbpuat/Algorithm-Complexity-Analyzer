import { apiCompare, apiRun } from '../api/client';
import { runTimed } from '../lib/timedAlgorithms';
import type { AlgorithmId, RunResult } from '../types';

function localResult(
  algorithm: AlgorithmId,
  input: number[],
  searchTarget?: number
): RunResult {
  const m = runTimed(algorithm, input, searchTarget);
  return {
    algorithm,
    n: input.length,
    timeMs: m.timeMs,
    comparisons: m.comparisons,
    swaps: m.swaps,
  };
}

export async function runSingle(
  algorithm: AlgorithmId,
  input: number[],
  searchTarget?: number
): Promise<RunResult> {
  try {
    return await apiRun(algorithm, input, searchTarget);
  } catch {
    return localResult(algorithm, input, searchTarget);
  }
}

export async function runCompareMany(
  algorithms: AlgorithmId[],
  input: number[],
  searchTarget?: number
): Promise<RunResult[]> {
  try {
    return await apiCompare(algorithms, input, searchTarget);
  } catch {
    return algorithms.map((a) => localResult(a, input, searchTarget));
  }
}

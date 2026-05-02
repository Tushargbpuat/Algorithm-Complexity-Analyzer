import { apiEstimateComplexity } from '../api/client';
import { estimateComplexityLocal } from '../lib/complexityFit';
import type { ComplexityEstimate } from '../types';

export async function estimateFromPoints(
  points: { n: number; timeMs: number }[]
): Promise<{ estimate: ComplexityEstimate; source: 'server' | 'browser' }> {
  try {
    const estimate = await apiEstimateComplexity(points);
    return { estimate, source: 'server' };
  } catch {
    return { estimate: estimateComplexityLocal(points), source: 'browser' };
  }
}

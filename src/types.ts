export type AlgorithmId =
  | 'bubbleSort'
  | 'selectionSort'
  | 'mergeSort'
  | 'quickSort'
  | 'heapSort'
  | 'linearSearch'
  | 'binarySearch';

export interface RunResult {
  algorithm: AlgorithmId;
  n: number;
  timeMs: number;
  comparisons: number;
  swaps: number;
  searchTarget?: number;
  searchIndex?: number;
  error?: string;
}

export interface BenchmarkPoint {
  n: number;
  timeMs: number;
  comparisons: number;
  swaps: number;
}

export interface BenchmarkSeries {
  algorithm: AlgorithmId;
  points: BenchmarkPoint[];
}

export interface ComplexityEstimate {
  label: 'O(n)' | 'O(n log n)' | 'O(n²)';
  score: number;
  residuals: Record<'O(n)' | 'O(n log n)' | 'O(n²)', number>;
}

export interface SortStep {
  array: number[];
  /** Indices involved in this step */
  highlights: number[];
  kind: 'compare' | 'swap' | 'pivot' | 'merge' | 'done';
}

export interface HistoryEntry {
  id: string;
  at: number;
  algorithms: AlgorithmId[];
  n: number;
  winner: AlgorithmId | null;
  results: RunResult[];
}

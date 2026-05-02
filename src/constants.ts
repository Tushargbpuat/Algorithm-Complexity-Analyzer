import type { AlgorithmId } from './types';

export const SORT_ALGORITHMS: AlgorithmId[] = [
  'bubbleSort',
  'selectionSort',
  'mergeSort',
  'quickSort',
  'heapSort',
];

export const SEARCH_ALGORITHMS: AlgorithmId[] = ['linearSearch', 'binarySearch'];

export const ALL_ALGORITHMS: AlgorithmId[] = [...SORT_ALGORITHMS, ...SEARCH_ALGORITHMS];

export const ALGORITHM_LABELS: Record<AlgorithmId, string> = {
  bubbleSort: 'Bubble Sort',
  selectionSort: 'Selection Sort',
  mergeSort: 'Merge Sort',
  quickSort: 'Quick Sort',
  heapSort: 'Heap Sort',
  linearSearch: 'Linear Search',
  binarySearch: 'Binary Search',
};

export const ALGORITHM_THEORY: Record<AlgorithmId, string> = {
  bubbleSort: 'O(n²) worst/average',
  selectionSort: 'O(n²)',
  mergeSort: 'O(n log n)',
  quickSort: 'O(n log n) average, O(n²) worst',
  heapSort: 'O(n log n)',
  linearSearch: 'O(n)',
  binarySearch: 'O(log n)',
};

/** Conservative browser limits to avoid freezing on O(n²) sorts */
export const CLIENT_LIMITS: Record<AlgorithmId, number> = {
  bubbleSort: 8000,
  selectionSort: 8000,
  mergeSort: 200_000,
  quickSort: 200_000,
  heapSort: 200_000,
  linearSearch: 500_000,
  binarySearch: 500_000,
};

export const CHART_COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#38bdf8',
];

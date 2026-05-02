import type { AlgorithmId, SortStep } from '../types';

const MAX_STEPS = 800;

function pushStep(
  steps: SortStep[],
  arr: number[],
  highlights: number[],
  kind: SortStep['kind']
): void {
  if (steps.length >= MAX_STEPS) return;
  steps.push({ array: [...arr], highlights, kind });
}

export interface InstrumentResult {
  comparisons: number;
  swaps: number;
  steps: SortStep[];
}

/** Bubble sort with full tracing for bar visualization. */
export function instrumentBubbleSort(original: number[]): InstrumentResult {
  const a = [...original];
  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      comparisons++;
      pushStep(steps, a, [j, j + 1], 'compare');
      if (a[j] > a[j + 1]) {
        swaps++;
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        pushStep(steps, a, [j, j + 1], 'swap');
      }
    }
  }
  pushStep(steps, a, [], 'done');
  return { comparisons, swaps, steps };
}

export function instrumentSelectionSort(original: number[]): InstrumentResult {
  const a = [...original];
  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      pushStep(steps, a, [minIdx, j], 'compare');
      if (a[j] < a[minIdx]) minIdx = j;
    }
    if (minIdx !== i) {
      swaps++;
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      pushStep(steps, a, [i, minIdx], 'swap');
    }
  }
  pushStep(steps, a, [], 'done');
  return { comparisons, swaps, steps };
}

function mergeRanges(
  a: number[],
  left: number,
  mid: number,
  right: number,
  steps: SortStep[],
  comparisons: { value: number },
  swaps: { value: number }
): void {
  const L = a.slice(left, mid + 1);
  const R = a.slice(mid + 1, right + 1);
  let i = 0;
  let j = 0;
  let k = left;
  while (i < L.length && j < R.length) {
    comparisons.value++;
    pushStep(steps, a, [k, left + i, mid + 1 + j], 'compare');
    if (L[i] <= R[j]) {
      if (a[k] !== L[i]) {
        swaps.value++;
        a[k] = L[i];
        pushStep(steps, a, [k], 'merge');
      }
      i++;
    } else {
      swaps.value++;
      a[k] = R[j];
      pushStep(steps, a, [k], 'merge');
      j++;
    }
    k++;
  }
  while (i < L.length) {
    if (a[k] !== L[i]) {
      swaps.value++;
      a[k] = L[i];
      pushStep(steps, a, [k], 'merge');
    }
    i++;
    k++;
  }
  while (j < R.length) {
    if (a[k] !== R[j]) {
      swaps.value++;
      a[k] = R[j];
      pushStep(steps, a, [k], 'merge');
    }
    j++;
    k++;
  }
}

function mergeSortRange(
  a: number[],
  left: number,
  right: number,
  steps: SortStep[],
  comparisons: { value: number },
  swaps: { value: number }
): void {
  if (left >= right) return;
  const mid = Math.floor((left + right) / 2);
  pushStep(steps, a, [mid], 'pivot');
  mergeSortRange(a, left, mid, steps, comparisons, swaps);
  mergeSortRange(a, mid + 1, right, steps, comparisons, swaps);
  mergeRanges(a, left, mid, right, steps, comparisons, swaps);
}

export function instrumentMergeSort(original: number[]): InstrumentResult {
  const a = [...original];
  const steps: SortStep[] = [];
  const comparisons = { value: 0 };
  const swaps = { value: 0 };
  if (a.length > 1) {
    mergeSortRange(a, 0, a.length - 1, steps, comparisons, swaps);
  }
  pushStep(steps, a, [], 'done');
  return { comparisons: comparisons.value, swaps: swaps.value, steps };
}

function partition(
  a: number[],
  low: number,
  high: number,
  steps: SortStep[],
  comparisons: { value: number },
  swaps: { value: number }
): number {
  const pivot = a[high];
  pushStep(steps, a, [high], 'pivot');
  let i = low - 1;
  for (let j = low; j < high; j++) {
    comparisons.value++;
    pushStep(steps, a, [j, high], 'compare');
    if (a[j] < pivot) {
      i++;
      if (i !== j) {
        swaps.value++;
        [a[i], a[j]] = [a[j], a[i]];
        pushStep(steps, a, [i, j], 'swap');
      }
    }
  }
  swaps.value++;
  [a[i + 1], a[high]] = [a[high], a[i + 1]];
  pushStep(steps, a, [i + 1, high], 'swap');
  return i + 1;
}

function quickSortRange(
  a: number[],
  low: number,
  high: number,
  steps: SortStep[],
  comparisons: { value: number },
  swaps: { value: number }
): void {
  if (low < high) {
    const pi = partition(a, low, high, steps, comparisons, swaps);
    quickSortRange(a, low, pi - 1, steps, comparisons, swaps);
    quickSortRange(a, pi + 1, high, steps, comparisons, swaps);
  }
}

export function instrumentQuickSort(original: number[]): InstrumentResult {
  const a = [...original];
  const steps: SortStep[] = [];
  const comparisons = { value: 0 };
  const swaps = { value: 0 };
  if (a.length > 1) {
    quickSortRange(a, 0, a.length - 1, steps, comparisons, swaps);
  }
  pushStep(steps, a, [], 'done');
  return { comparisons: comparisons.value, swaps: swaps.value, steps };
}

function heapify(
  a: number[],
  heapSize: number,
  root: number,
  steps: SortStep[],
  comparisons: { value: number },
  swaps: { value: number }
): void {
  let largest = root;
  const left = 2 * root + 1;
  const right = 2 * root + 2;

  if (left < heapSize) {
    comparisons.value++;
    pushStep(steps, a, [largest, left], 'compare');
    if (a[left] > a[largest]) largest = left;
  }
  if (right < heapSize) {
    comparisons.value++;
    pushStep(steps, a, [largest, right], 'compare');
    if (a[right] > a[largest]) largest = right;
  }

  if (largest !== root) {
    swaps.value++;
    [a[root], a[largest]] = [a[largest], a[root]];
    pushStep(steps, a, [root, largest], 'swap');
    heapify(a, heapSize, largest, steps, comparisons, swaps);
  }
}

export function instrumentHeapSort(original: number[]): InstrumentResult {
  const a = [...original];
  const steps: SortStep[] = [];
  const comparisons = { value: 0 };
  const swaps = { value: 0 };
  const n = a.length;

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    pushStep(steps, a, [i], 'pivot');
    heapify(a, n, i, steps, comparisons, swaps);
  }

  for (let i = n - 1; i > 0; i--) {
    swaps.value++;
    [a[0], a[i]] = [a[i], a[0]];
    pushStep(steps, a, [0, i], 'swap');
    heapify(a, i, 0, steps, comparisons, swaps);
  }

  pushStep(steps, a, [], 'done');
  return { comparisons: comparisons.value, swaps: swaps.value, steps };
}

export function instrumentLinearSearch(arr: number[], target: number): InstrumentResult {
  const steps: SortStep[] = [];
  let comparisons = 0;
  for (let i = 0; i < arr.length; i++) {
    comparisons++;
    pushStep(steps, [...arr], [i], 'compare');
    if (arr[i] === target) {
      pushStep(steps, [...arr], [i], 'done');
      return { comparisons, swaps: 0, steps };
    }
  }
  pushStep(steps, [...arr], [], 'done');
  return { comparisons, swaps: 0, steps };
}

export function instrumentBinarySearch(sorted: number[], target: number): InstrumentResult {
  const steps: SortStep[] = [];
  let comparisons = 0;
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    comparisons++;
    pushStep(steps, [...sorted], [lo, mid, hi], 'compare');
    if (sorted[mid] === target) {
      pushStep(steps, [...sorted], [mid], 'done');
      return { comparisons, swaps: 0, steps };
    }
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  pushStep(steps, [...sorted], [], 'done');
  return { comparisons, swaps: 0, steps };
}

export function runInstrumented(algorithm: AlgorithmId, input: number[], target?: number): InstrumentResult {
  switch (algorithm) {
    case 'bubbleSort':
      return instrumentBubbleSort(input);
    case 'selectionSort':
      return instrumentSelectionSort(input);
    case 'mergeSort':
      return instrumentMergeSort(input);
    case 'quickSort':
      return instrumentQuickSort(input);
    case 'heapSort':
      return instrumentHeapSort(input);
    case 'linearSearch': {
      const t = target ?? input[0] ?? 0;
      return instrumentLinearSearch(input, t);
    }
    case 'binarySearch': {
      const sorted = [...input].sort((a, b) => a - b);
      const t = target ?? sorted[Math.floor(sorted.length / 2)] ?? 0;
      return instrumentBinarySearch(sorted, t);
    }
    default:
      return { comparisons: 0, swaps: 0, steps: [] };
  }
}

export function isSortAlgorithm(id: AlgorithmId): boolean {
  return (
    id === 'bubbleSort' ||
    id === 'selectionSort' ||
    id === 'mergeSort' ||
    id === 'quickSort' ||
    id === 'heapSort'
  );
}

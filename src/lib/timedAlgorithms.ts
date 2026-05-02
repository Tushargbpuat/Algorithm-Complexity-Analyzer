/**
 * Timing-focused runs without step capture — used for browser-side benchmark fallback.
 */

import type { AlgorithmId } from '../types';

export interface TimedMetrics {
  comparisons: number;
  swaps: number;
  timeMs: number;
}

function bubbleSort(a: number[]): Pick<TimedMetrics, 'comparisons' | 'swaps'> {
  let comparisons = 0;
  let swaps = 0;
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      comparisons++;
      if (a[j] > a[j + 1]) {
        swaps++;
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
      }
    }
  }
  return { comparisons, swaps };
}

function selectionSort(a: number[]): Pick<TimedMetrics, 'comparisons' | 'swaps'> {
  let comparisons = 0;
  let swaps = 0;
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      if (a[j] < a[minIdx]) minIdx = j;
    }
    if (minIdx !== i) {
      swaps++;
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
    }
  }
  return { comparisons, swaps };
}

function mergeSortInternal(a: number[]): Pick<TimedMetrics, 'comparisons' | 'swaps'> {
  let comparisons = 0;
  let swaps = 0;

  function merge(left: number, mid: number, right: number): void {
    const L = a.slice(left, mid + 1);
    const R = a.slice(mid + 1, right + 1);
    let i = 0;
    let j = 0;
    let k = left;
    while (i < L.length && j < R.length) {
      comparisons++;
      if (L[i] <= R[j]) {
        if (a[k] !== L[i]) swaps++;
        a[k++] = L[i++];
      } else {
        swaps++;
        a[k++] = R[j++];
      }
    }
    while (i < L.length) {
      if (a[k] !== L[i]) swaps++;
      a[k++] = L[i++];
    }
    while (j < R.length) {
      swaps++;
      a[k++] = R[j++];
    }
  }

  function sortRange(l: number, r: number): void {
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    sortRange(l, m);
    sortRange(m + 1, r);
    merge(l, m, r);
  }

  if (a.length > 1) sortRange(0, a.length - 1);
  return { comparisons, swaps };
}

function partition(a: number[], low: number, high: number): { comparisons: number; swaps: number; pi: number } {
  let comparisons = 0;
  let swaps = 0;
  const pivot = a[high];
  let i = low - 1;
  for (let j = low; j < high; j++) {
    comparisons++;
    if (a[j] < pivot) {
      i++;
      if (i !== j) {
        swaps++;
        [a[i], a[j]] = [a[j], a[i]];
      }
    }
  }
  swaps++;
  [a[i + 1], a[high]] = [a[high], a[i + 1]];
  return { comparisons, swaps, pi: i + 1 };
}

function quickSortRange(a: number[], low: number, high: number): Pick<TimedMetrics, 'comparisons' | 'swaps'> {
  let comparisons = 0;
  let swaps = 0;
  if (low < high) {
    const p = partition(a, low, high);
    comparisons += p.comparisons;
    swaps += p.swaps;
    const left = quickSortRange(a, low, p.pi - 1);
    const right = quickSortRange(a, p.pi + 1, high);
    comparisons += left.comparisons + right.comparisons;
    swaps += left.swaps + right.swaps;
  }
  return { comparisons, swaps };
}

function heapify(a: number[], heapSize: number, root: number): Pick<TimedMetrics, 'comparisons' | 'swaps'> {
  let comparisons = 0;
  let swaps = 0;
  let largest = root;
  const left = 2 * root + 1;
  const right = 2 * root + 2;

  if (left < heapSize) {
    comparisons++;
    if (a[left] > a[largest]) largest = left;
  }
  if (right < heapSize) {
    comparisons++;
    if (a[right] > a[largest]) largest = right;
  }

  if (largest !== root) {
    swaps++;
    [a[root], a[largest]] = [a[largest], a[root]];
    const child = heapify(a, heapSize, largest);
    comparisons += child.comparisons;
    swaps += child.swaps;
  }

  return { comparisons, swaps };
}

function heapSort(a: number[]): Pick<TimedMetrics, 'comparisons' | 'swaps'> {
  let comparisons = 0;
  let swaps = 0;
  const n = a.length;

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    const m = heapify(a, n, i);
    comparisons += m.comparisons;
    swaps += m.swaps;
  }

  for (let i = n - 1; i > 0; i--) {
    swaps++;
    [a[0], a[i]] = [a[i], a[0]];
    const m = heapify(a, i, 0);
    comparisons += m.comparisons;
    swaps += m.swaps;
  }

  return { comparisons, swaps };
}

function linearSearch(arr: number[], target: number): Pick<TimedMetrics, 'comparisons' | 'swaps'> {
  let comparisons = 0;
  for (let i = 0; i < arr.length; i++) {
    comparisons++;
    if (arr[i] === target) break;
  }
  return { comparisons, swaps: 0 };
}

function binarySearch(sorted: number[], target: number): Pick<TimedMetrics, 'comparisons' | 'swaps'> {
  let comparisons = 0;
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    comparisons++;
    const mid = Math.floor((lo + hi) / 2);
    if (sorted[mid] === target) break;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return { comparisons, swaps: 0 };
}

export function runTimed(algorithm: AlgorithmId, input: number[], target?: number): TimedMetrics {
  const a = [...input];
  const t0 = performance.now();

  let metrics: Pick<TimedMetrics, 'comparisons' | 'swaps'>;
  switch (algorithm) {
    case 'bubbleSort':
      metrics = bubbleSort(a);
      break;
    case 'selectionSort':
      metrics = selectionSort(a);
      break;
    case 'mergeSort':
      metrics = mergeSortInternal(a);
      break;
    case 'quickSort':
      metrics = a.length > 1 ? quickSortRange(a, 0, a.length - 1) : { comparisons: 0, swaps: 0 };
      break;
    case 'heapSort':
      metrics = heapSort(a);
      break;
    case 'linearSearch': {
      const t = target ?? a[0] ?? 0;
      metrics = linearSearch([...input], t);
      break;
    }
    case 'binarySearch': {
      const sorted = [...input].sort((x, y) => x - y);
      const t = target ?? sorted[Math.floor(sorted.length / 2)] ?? 0;
      metrics = binarySearch(sorted, t);
      break;
    }
    default:
      metrics = { comparisons: 0, swaps: 0 };
  }

  const t1 = performance.now();
  return { ...metrics, timeMs: t1 - t0 };
}

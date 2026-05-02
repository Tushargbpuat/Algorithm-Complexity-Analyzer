import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ALGORITHM_LABELS,
  CLIENT_LIMITS,
  SEARCH_ALGORITHMS,
  SORT_ALGORITHMS,
} from '../constants';
import { runInstrumented, isSortAlgorithm } from '../lib/instrumentedAlgorithms';
import type { AlgorithmId, SortStep } from '../types';

const MAX_VIZ_ARRAY = 120;

interface Props {
  algorithm: AlgorithmId;
  values: number[];
  searchTarget: number;
}

export function SortVisualizer({ algorithm, values, searchTarget }: Props) {
  const [steps, setSteps] = useState<SortStep[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(45);
  const timerRef = useRef<number | null>(null);

  const prepared = useMemo(() => {
    const lim = CLIENT_LIMITS[algorithm];
    if (values.length > lim) {
      return {
        error: `Visualization limited to n ≤ ${lim.toLocaleString()} for ${ALGORITHM_LABELS[algorithm]}.`,
      } as const;
    }
    if (values.length > MAX_VIZ_ARRAY) {
      return {
        error: `Bar view supports up to ${MAX_VIZ_ARRAY} elements. Reduce input size or use benchmark mode.`,
      } as const;
    }
    if (values.length === 0) {
      return { error: 'Provide a non-empty array.' } as const;
    }
    return { ok: true as const };
  }, [algorithm, values.length]);

  useEffect(() => {
    setPlaying(false);
    setIndex(0);
    if ('error' in prepared) {
      setSteps([]);
      return;
    }
    const inst =
      algorithm === 'linearSearch'
        ? runInstrumented('linearSearch', values, searchTarget)
        : algorithm === 'binarySearch'
          ? runInstrumented('binarySearch', values, searchTarget)
          : isSortAlgorithm(algorithm)
            ? runInstrumented(algorithm, values)
            : { steps: [] as SortStep[], comparisons: 0, swaps: 0 };
    setSteps(inst.steps);
    setIndex(0);
  }, [algorithm, values, searchTarget, prepared]);

  useEffect(() => {
    if (!playing || steps.length === 0) return;
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1 >= steps.length ? steps.length - 1 : i + 1));
    }, Math.max(8, 220 - speed));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, steps.length, speed]);

  const current = steps[index] ?? steps[0];
  const maxVal = useMemo(() => {
    if (!current?.array.length) return 1;
    return Math.max(...current.array, 1);
  }, [current]);

  const reset = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);

  const stepBack = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const stepFwd = useCallback(() => {
    setIndex((i) => Math.min(steps.length - 1, i + 1));
  }, [steps.length]);

  if ('error' in prepared && prepared.error) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        {prepared.error}
      </div>
    );
  }

  const kind = SORT_ALGORITHMS.includes(algorithm)
    ? 'sort'
    : SEARCH_ALGORITHMS.includes(algorithm)
      ? 'search'
      : 'other';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          disabled={steps.length === 0}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-40"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={stepBack}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          Step −
        </button>
        <button
          type="button"
          onClick={stepFwd}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          Step +
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          Speed
          <input
            type="range"
            min={8}
            max={200}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </label>
        <span className="font-mono text-xs text-slate-500">
          frame {index + 1}/{Math.max(1, steps.length)}
        </span>
      </div>

      {kind === 'search' && (
        <p className="text-xs text-slate-500">
          Binary search uses a sorted copy of your array. Target:{' '}
          <span className="font-mono text-cyan-400">{searchTarget}</span>
        </p>
      )}

      <div className="relative h-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80 p-4 dark:bg-slate-950">
        {current && (
          <div className="flex h-full items-end justify-center gap-px sm:gap-[2px]">
            {current.array.map((v, i) => {
              const h = (v / maxVal) * 100;
              const hi = current.highlights.includes(i);
              const color = hi
                ? current.kind === 'swap' || current.kind === 'merge'
                  ? 'bg-fuchsia-400'
                  : 'bg-amber-300'
                : 'bg-cyan-600/80';
              return (
                <div
                  key={`${i}-${v}-${index}`}
                  className={clsx('w-full max-w-[12px] rounded-t transition-colors', color)}
                  style={{ height: `${h}%` }}
                  title={`${v}`}
                />
              );
            })}
          </div>
        )}
      </div>
      {steps.length >= 800 && (
        <p className="text-xs text-amber-400/90">
          Step trace capped at 800 frames for performance. Totals still reflect full run on server /
          timed path.
        </p>
      )}
    </div>
  );
}

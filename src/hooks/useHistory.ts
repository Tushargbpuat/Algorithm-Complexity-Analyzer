import { useCallback, useMemo, useState } from 'react';
import type { AlgorithmId, HistoryEntry, RunResult } from '../types';

const KEY = 'acv-history';
const MAX = 40;

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useRunHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(load);

  const push = useCallback((algorithms: AlgorithmId[], results: RunResult[]) => {
    const valid = results.filter((r) => !r.error);
    let winner: AlgorithmId | null = null;
    if (valid.length) {
      winner = valid.reduce((a, b) => (a.timeMs <= b.timeMs ? a : b)).algorithm;
    }
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      at: Date.now(),
      algorithms,
      n: results[0]?.n ?? 0,
      winner,
      results,
    };
    setEntries((prev) => {
      const next = [entry, ...prev].slice(0, MAX);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const leaderboard = useMemo(() => {
    const wins: Partial<Record<AlgorithmId, number>> = {};
    for (const e of entries) {
      if (e.winner) wins[e.winner] = (wins[e.winner] ?? 0) + 1;
    }
    return Object.entries(wins)
      .sort((a, b) => b[1] - a[1])
      .map(([alg, count]) => ({ algorithm: alg as AlgorithmId, count }));
  }, [entries]);

  return { entries, push, clear, leaderboard };
}

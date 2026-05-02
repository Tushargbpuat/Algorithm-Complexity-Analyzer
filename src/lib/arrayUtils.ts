export function parseNumberArray(text: string): number[] {
  const parts = text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n))) {
    throw new Error('Input contains non-numeric values');
  }
  return nums;
}

/** Mulberry32 PRNG for reproducible random arrays */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomIntArray(n: number, seed = Date.now()): number[] {
  const rnd = mulberry32(seed >>> 0);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.floor(rnd() * 1_000_000));
  }
  return out;
}

export function formatArrayPreview(arr: number[], max = 12): string {
  if (arr.length <= max) return JSON.stringify(arr);
  return `[${arr.slice(0, max).join(', ')}, … +${arr.length - max}]`;
}

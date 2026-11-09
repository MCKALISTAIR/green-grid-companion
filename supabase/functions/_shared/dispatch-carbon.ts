interface Interval {
  from: string;
  to: string;
  intensity?: { actual?: number | null; forecast?: number | null };
}

/** Constant charging power assumption; every instant must have usable intensity. */
export function dispatchCarbon(intervals: Interval[], start: number, end: number, kwh: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isFinite(kwh) || kwh <= 0) return null;
  let cursor = start;
  let weighted = 0;
  for (const row of [...intervals].sort((a, b) => Date.parse(a.from) - Date.parse(b.from))) {
    const from = Math.max(start, Date.parse(row.from));
    const to = Math.min(end, Date.parse(row.to));
    if (to <= start || from >= end) continue;
    const value = row.intensity?.actual ?? row.intensity?.forecast;
    if (!Number.isFinite(from) || !Number.isFinite(to) || from !== cursor || to <= from || typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    weighted += value * (to - from);
    cursor = to;
  }
  if (cursor !== end) return null;
  const avg = weighted / (end - start);
  const used = Math.round(kwh * avg * 100) / 100;
  return { avg: Math.round(avg), used, saved: Math.max(0, Math.round((kwh * 230 - used) * 100) / 100) };
}
import type { ForecastData } from './carbonApi';
import { londonDateKey, londonDayBounds, nextDateKey } from './londonTime';

/** Only complete, explicitly evidenced UK days count as fuel-free days. */
export function fuelFreeDays(data: ForecastData[], fuel: string) {
  const days = new Map<string, ForecastData[]>();
  for (const row of data) {
    const key = londonDateKey(new Date(row.from));
    days.set(key, [...(days.get(key) ?? []), row]);
  }
  const free = [...days]
    .filter(([key, rows]) => {
      const bounds = londonDayBounds(key);
      let cursor = bounds.from.getTime();
      for (const row of [...rows].sort((a, b) => Date.parse(a.from) - Date.parse(b.from))) {
        const value = row.generationmix?.find((m) => m.fuel === fuel)?.perc;
        if (
          Date.parse(row.from) !== cursor ||
          Date.parse(row.to) - cursor !== 1800_000 ||
          value !== 0
        )
          return false;
        cursor = Date.parse(row.to);
      }
      return cursor === bounds.to.getTime() + 1;
    })
    .map(([key]) => key)
    .sort();
  let run: string[] = [],
    longest: string[] = [];
  for (const key of free) {
    if (run.length && nextDateKey(run[run.length - 1]) !== key) run = [];
    run.push(key);
    if (run.length > longest.length) longest = [...run];
  }
  return {
    days: free.length,
    longest: longest.length
      ? { fuel, startDate: longest[0], endDate: longest[longest.length - 1], days: longest.length }
      : null,
  };
}

interface GenerationRow {
  from: string;
  to: string;
  generationmix?: { fuel: string; perc: number }[];
}
export function evidencedFuelHistory(data: GenerationRow[], fuel: string, from: Date, to: Date) {
  const rows = [...data].sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
  let cursor = from.getTime();
  let lastPositive: string | null = null;
  for (const row of rows) {
    const start = Math.max(from.getTime(), Date.parse(row.from));
    const end = Math.min(to.getTime(), Date.parse(row.to));
    if (end <= from.getTime() || start >= to.getTime()) continue;
    const value = row.generationmix?.find((m) => m.fuel.toLowerCase() === fuel)?.perc;
    if (
      start !== cursor ||
      !Number.isFinite(end) ||
      end <= start ||
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0
    )
      return { lastSeen: null, exceededLookback: false };
    if (value > 0) lastPositive = row.to;
    cursor = end;
  }
  // APIs return completed half-hours; tolerate only the current unfinished slot.
  if (cursor < Math.floor(to.getTime() / 1800_000) * 1800_000)
    return { lastSeen: null, exceededLookback: false };
  return {
    lastSeen: lastPositive ?? from.toISOString(),
    exceededLookback: !lastPositive && cursor - from.getTime() >= 30 * 86400_000,
  };
}

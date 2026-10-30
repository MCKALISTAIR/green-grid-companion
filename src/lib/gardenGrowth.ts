import type { ForecastData } from '@/lib/carbonApi';
import { londonDateKey, londonMidnight } from '@/lib/londonTime';
import { nesoBand } from '@/lib/nesoBand';

/** BH-143: the garden looks back over this many whole UK days. */
export const GARDEN_WINDOW_DAYS = 14;

function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
}

/** The last 14 complete UK days before today, oldest first. */
export function gardenWindowKeys(now: Date): string[] {
  const today = londonDateKey(now);
  return Array.from({ length: GARDEN_WINDOW_DAYS }, (_, i) =>
    shiftDateKey(today, i - GARDEN_WINDOW_DAYS),
  );
}

/** Fetch range for the window: first day's London midnight to today's London midnight. */
export function gardenWindowRange(now: Date): { from: Date; to: Date } {
  const keys = gardenWindowKeys(now);
  return { from: londonMidnight(keys[0]), to: londonMidnight(londonDateKey(now)) };
}

/**
 * BH-143: number of days in the last 14 whose average intensity for the selected
 * area was in NESO's low or very low band (same band function as the label).
 * Uses NESO's actual where published, else its forecast. Days with no data don't count.
 */
export function countLowCarbonDays(rows: ForecastData[], now: Date): number {
  const keys = new Set(gardenWindowKeys(now));
  const sums = new Map<string, { total: number; n: number }>();
  for (const row of rows) {
    const value = row.intensity?.actual ?? row.intensity?.forecast;
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const key = londonDateKey(new Date(row.from));
    if (!keys.has(key)) continue;
    const s = sums.get(key) ?? { total: 0, n: 0 };
    s.total += value;
    s.n += 1;
    sums.set(key, s);
  }
  let days = 0;
  for (const { total, n } of sums.values()) {
    const band = nesoBand(total / n);
    if (band === 'very low' || band === 'low') days++;
  }
  return days;
}

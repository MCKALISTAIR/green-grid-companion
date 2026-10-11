import type { ForecastData } from '@/lib/carbonApi';

/**
 * Helpers for the /history intensity chart.
 *
 * Regions like South Scotland genuinely sit at or near 0 gCO₂/kWh for days
 * (wind + nuclear). Auto-scaling the y-axis to the data then stretches a 6g
 * blip across the whole chart, so it looks like a dirty spike. A minimum
 * ceiling keeps near-zero weeks reading as near zero.
 */
export const HISTORY_Y_MIN_CEILING = 100;

function isUsable(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

export interface HistoryPoint {
  forecast: number | null;
  actual: number | null;
}

/** Map one API row to chart values. Missing stays null (drawn as a gap, never 0). */
export function toHistoryPoint(item: ForecastData): HistoryPoint {
  const f = item.intensity?.forecast;
  const a = item.intensity?.actual;
  return { forecast: isUsable(f) ? f : null, actual: isUsable(a) ? a : null };
}

/** Upper bound for the intensity axis: the data max rounded up, but never below the ceiling. */
export function historyYAxisMax(points: HistoryPoint[]): number {
  let max = 0;
  for (const p of points) {
    if (p.forecast !== null && p.forecast > max) max = p.forecast;
    if (p.actual !== null && p.actual > max) max = p.actual;
  }
  const rounded = Math.ceil((max * 1.1) / 50) * 50;
  return Math.max(HISTORY_Y_MIN_CEILING, rounded);
}

/** Average forecast over half-hours that have one; null when none do. */
export function averageForecast(items: ForecastData[]): number | null {
  const values = items.map((i) => i.intensity?.forecast).filter(isUsable);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** True when the whole range stays under `threshold` gCO₂/kWh (a near-zero week). */
export function isNearZeroRange(points: HistoryPoint[], threshold = 20): boolean {
  const values = points.flatMap((p) => [p.forecast, p.actual]).filter((v): v is number => v !== null);
  return values.length > 0 && values.every((v) => v < threshold);
}

import { parseISO } from 'date-fns';
import type { ForecastData } from '@/lib/carbonApi';

/** Number of 30-minute forecast slots in an optimal window (3 hours). */
export const OPTIMAL_WINDOW_SLOTS = 6;

/** Waiting must be at least this much cleaner (percent) to be worth it. */
export const MIN_PERCENT_CLEANER = 12;

/** ...and at least this many gCO₂/kWh cleaner, so tiny grids don't trigger "wait". */
export const MIN_GRAMS_CLEANER = 15;

/** At or below this, a whole window counts as "at or near zero carbon" (gCO₂/kWh). */
export const NEAR_ZERO_MAX = 10;

export type SpreadKind = 'near_zero' | 'flat' | 'varied';

/**
 * How much a run of intensity values moves. Shared by the Now-or-wait card,
 * the Power Planner and the 48-hour overview so they describe the same data
 * the same way.
 * - near_zero: every value is at or below NEAR_ZERO_MAX
 * - flat: the spread is under MIN_GRAMS_CLEANER, so no start time is meaningfully cleaner
 * - varied: anything else
 * Callers pass real values only (missing values must be dropped, never 0).
 */
export function classifySpread(values: number[]): SpreadKind | null {
  if (values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max <= NEAR_ZERO_MAX) return 'near_zero';
  if (max - min < MIN_GRAMS_CLEANER) return 'flat';
  return 'varied';
}

export interface ForecastWindow {
  bestStart: Date;
  bestEnd: Date;
  worstStart: Date;
  worstEnd: Date;
  minAvg: number;
  maxAvg: number;
}

/** Find the best and worst contiguous 3-hour windows in the future forecast. */
export function getBestWorstWindows(forecast: ForecastData[]): ForecastWindow | null {
  if (forecast.length < OPTIMAL_WINDOW_SLOTS) return null;

  const now = new Date();
  const futureForecast = forecast.filter((f) => new Date(f.to) > now)
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
  if (futureForecast.length < OPTIMAL_WINDOW_SLOTS) return null;

  let minSum = Infinity;
  let minStartIndex = 0;
  let maxSum = -Infinity;
  let maxStartIndex = 0;

  for (let i = 0; i <= futureForecast.length - OPTIMAL_WINDOW_SLOTS; i++) {
    const window = futureForecast.slice(i, i + OPTIMAL_WINDOW_SLOTS);
    if (!window.every((slot, j) =>
      Number.isFinite(slot.intensity.forecast) && slot.intensity.forecast >= 0 &&
      Date.parse(slot.to) - Date.parse(slot.from) === 30 * 60_000 &&
      (j === 0 || Date.parse(slot.from) === Date.parse(window[j - 1].to)) &&
      !futureForecast.some((other, k) => k !== i + j && Date.parse(other.from) < Date.parse(slot.to) && Date.parse(other.to) > Date.parse(slot.from))
    )) continue;
    const sum = window
      .reduce((acc, f) => acc + f.intensity.forecast, 0);
    if (sum < minSum) {
      minSum = sum;
      minStartIndex = i;
    }
    if (sum > maxSum) {
      maxSum = sum;
      maxStartIndex = i;
    }
  }

  if (!Number.isFinite(minSum)) return null;
  return {
    bestStart: parseISO(futureForecast[minStartIndex].from),
    bestEnd: parseISO(futureForecast[minStartIndex + OPTIMAL_WINDOW_SLOTS - 1].to),
    worstStart: parseISO(futureForecast[maxStartIndex].from),
    worstEnd: parseISO(futureForecast[maxStartIndex + OPTIMAL_WINDOW_SLOTS - 1].to),
    minAvg: Math.round(minSum / OPTIMAL_WINDOW_SLOTS),
    maxAvg: Math.round(maxSum / OPTIMAL_WINDOW_SLOTS),
  };
}

/**
 * Only warn about a "worst" window when it is meaningfully dirtier than the
 * best one (same thresholds as the now-or-wait card).
 */
export function isWorstWindowWorthFlagging(
  w: Pick<ForecastWindow, 'minAvg' | 'maxAvg'>,
  minPercent = MIN_PERCENT_CLEANER,
  minGrams = MIN_GRAMS_CLEANER,
): boolean {
  const spread = w.maxAvg - w.minAvg;
  if (w.maxAvg <= 0 || spread < minGrams) return false;
  return (spread / w.maxAvg) * 100 >= minPercent;
}

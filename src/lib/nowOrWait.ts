import { format, parseISO } from 'date-fns';
import type { ForecastData } from '@/lib/carbonApi';
import { OPTIMAL_WINDOW_SLOTS } from '@/lib/forecastWindows';
import { getDayLabel } from '@/lib/date-utils';

/** Prefer near-term windows so FTUE never asks users to wait ~2 days. */
export const DECISION_HORIZON_HOURS = 18;

/** At or below this, "use now" is the default unless a near window is much cleaner. */
export const CLEAN_ENOUGH = 100;

/** Minimum gCO₂/kWh improvement required to recommend waiting. */
export const MEANINGFUL_IMPROVEMENT = 35;

export type NowOrWaitAction = 'use_now' | 'wait' | 'check_forecast';

export interface NowOrWaitDecision {
  action: NowOrWaitAction;
  headline: string;
  detail: string;
  tip: string;
  windowStart: Date | null;
  windowEnd: Date | null;
  windowAvg: number | null;
  countdownTarget: Date | null;
}

interface WindowCandidate {
  start: Date;
  end: Date;
  avg: number;
}

function findBestWindow(
  forecast: ForecastData[],
  now: Date,
  horizonEnd: Date | null,
): WindowCandidate | null {
  const future = forecast.filter((f) => {
    const to = new Date(f.to);
    const from = new Date(f.from);
    if (to <= now) return false;
    if (horizonEnd && from >= horizonEnd) return false;
    return true;
  });

  if (future.length < OPTIMAL_WINDOW_SLOTS) return null;

  let minSum = Infinity;
  let minStartIndex = 0;

  for (let i = 0; i <= future.length - OPTIMAL_WINDOW_SLOTS; i++) {
    const sum = future
      .slice(i, i + OPTIMAL_WINDOW_SLOTS)
      .reduce((acc, f) => acc + f.intensity.forecast, 0);
    if (sum < minSum) {
      minSum = sum;
      minStartIndex = i;
    }
  }

  return {
    start: parseISO(future[minStartIndex].from),
    end: parseISO(future[minStartIndex + OPTIMAL_WINDOW_SLOTS - 1].to),
    avg: Math.round(minSum / OPTIMAL_WINDOW_SLOTS),
  };
}

function isInsideWindow(now: Date, window: WindowCandidate): boolean {
  return now >= window.start && now <= window.end;
}

function formatWindowRange(start: Date, end: Date, avg: number): string {
  return `${format(start, 'HH:mm')} → ${format(end, 'HH:mm')} ${getDayLabel(new Date(start.getTime() - 60_000))} · ~${avg} gCO₂/kWh`;
}

/**
 * Single decision brain for "use energy now or wait?".
 * Tip, headline, and countdown always agree.
 */
export function getNowOrWaitDecision(
  intensity: number,
  forecast: ForecastData[],
  now: Date = new Date(),
): NowOrWaitDecision {
  if (!forecast || forecast.length < OPTIMAL_WINDOW_SLOTS) {
    if (intensity <= CLEAN_ENOUGH) {
      return {
        action: 'use_now',
        headline: 'Use energy now',
        detail: 'Grid is relatively clean right now',
        tip: 'Check back soon for a tailored forecast tip.',
        windowStart: null,
        windowEnd: null,
        windowAvg: null,
        countdownTarget: null,
      };
    }
    return {
      action: 'check_forecast',
      headline: 'Check the forecast',
      detail: 'More forecast data will unlock a clearer now-or-wait call.',
      tip: 'Check back later for a more tailored energy tip.',
      windowStart: null,
      windowEnd: null,
      windowAvg: null,
      countdownTarget: null,
    };
  }

  const horizonEnd = new Date(now.getTime() + DECISION_HORIZON_HOURS * 3600_000);
  const nearBest = findBestWindow(forecast, now, horizonEnd);

  if (nearBest && isInsideWindow(now, nearBest)) {
    return {
      action: 'use_now',
      headline: 'Use energy now',
      detail: `Cleanest nearby window open until ${format(nearBest.end, 'HH:mm')} · ~${nearBest.avg} gCO₂/kWh`,
      tip:
        intensity <= 50
          ? 'Carbon intensity is excellent right now — perfect for charging or running appliances.'
          : 'You are in a clean window. Good time to use energy before levels rise.',
      windowStart: nearBest.start,
      windowEnd: nearBest.end,
      windowAvg: nearBest.avg,
      countdownTarget: null,
    };
  }

  const improvement =
    nearBest && nearBest.start > now ? intensity - nearBest.avg : 0;
  const shouldWait =
    !!nearBest &&
    nearBest.start > now &&
    improvement >= MEANINGFUL_IMPROVEMENT &&
    (intensity > CLEAN_ENOUGH || improvement >= MEANINGFUL_IMPROVEMENT + 15);

  if (shouldWait && nearBest) {
    return {
      action: 'wait',
      headline: `Wait until ${format(nearBest.start, 'HH:mm')}`,
      detail: formatWindowRange(nearBest.start, nearBest.end, nearBest.avg),
      tip: `Shifting to ~${nearBest.avg} gCO₂/kWh is worth it if you can wait — plan a load for that window.`,
      windowStart: nearBest.start,
      windowEnd: nearBest.end,
      windowAvg: nearBest.avg,
      countdownTarget: nearBest.start,
    };
  }

  // Use now — either clean enough, or no meaningful near improvement
  if (intensity <= 50) {
    return {
      action: 'use_now',
      headline: 'Use energy now',
      detail: 'Grid is relatively clean right now',
      tip: 'Carbon intensity is excellent right now — perfect for charging or running appliances.',
      windowStart: nearBest?.start ?? null,
      windowEnd: nearBest?.end ?? null,
      windowAvg: nearBest?.avg ?? null,
      countdownTarget: null,
    };
  }

  if (intensity <= CLEAN_ENOUGH) {
    return {
      action: 'use_now',
      headline: 'Use energy now',
      detail: nearBest
        ? `Clean enough now · next clean window ~${nearBest.avg} gCO₂/kWh`
        : 'Grid is relatively clean right now',
      tip: 'Intensity is already in a good range. No need to wait for a cleaner nearby window.',
      windowStart: nearBest?.start ?? null,
      windowEnd: nearBest?.end ?? null,
      windowAvg: nearBest?.avg ?? null,
      countdownTarget: null,
    };
  }

  return {
    action: 'use_now',
    headline: 'Use energy now',
    detail: nearBest
      ? `Nothing much cleaner in the next ${DECISION_HORIZON_HOURS}h · currently ${intensity} gCO₂/kWh`
      : `Currently ${intensity} gCO₂/kWh`,
    tip: nearBest
      ? `The next ${DECISION_HORIZON_HOURS} hours stay similar — fine to use energy now if you need to.`
      : 'Carbon levels look stable for now. Check the forecast chart if your load is flexible.',
    windowStart: nearBest?.start ?? null,
    windowEnd: nearBest?.end ?? null,
    windowAvg: nearBest?.avg ?? null,
    countdownTarget: null,
  };
}

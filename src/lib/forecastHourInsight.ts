import { parseISO, isBefore, differenceInMinutes } from 'date-fns';
import { formatLondonShortWeekday, formatLondonTime, londonDayLabel } from '@/lib/londonTime';
import type { ForecastData } from '@/lib/carbonApi';
import { getConditionParts, type ConditionTone } from '@/lib/conditionLabels';
import type { NowOrWaitAction } from '@/lib/nowOrWait';
import { getSlotDisplayValue } from '@/lib/forecastUtils';

export type ForecastHourInsight = {
  /** Forecast slot index into the array. */
  index: number;
  /** e.g. "Now", "14:00", "Yesterday 22:00" */
  timeLabel: string;
  /** gCO₂/kWh value shown for the slot (actual preferred when present). */
  value: number;
  /** NESO intensity band for the slot. */
  band: string;
  /** Friendly / snarky condition line matching the home HUD. */
  condition: string;
  /** Comparison vs live intensity, e.g. "42g cleaner than now". */
  vsNow: string;
  /** Actionable one-liner tied to that hour. */
  action: string;
  /** True when this slot sits inside a very-low "best" run. */
  inBestWindow: boolean;
  /** Soft wash class for the insight strip border/background. */
  washClass: string;
  isPast: boolean;
  isCurrent: boolean;
};

const WASH: Record<string, string> = {
  'very low': 'bg-intensity-very-low/10 border-intensity-very-low/25',
  low: 'bg-intensity-low/10 border-intensity-low/25',
  moderate: 'bg-muted/40 border-border/50',
  high: 'bg-intensity-high/10 border-intensity-high/25',
  'very high': 'bg-intensity-very-high/10 border-intensity-very-high/25',
};

function resolveValue(item: ForecastData, now: Date): number {
  return getSlotDisplayValue(item, now) ?? 0;
}

function resolveBand(item: ForecastData): string {
  return (item.intensity.index || 'moderate').toLowerCase();
}

function buildTimeLabel(fromIso: string, now: Date, isCurrent: boolean, isPast: boolean): string {
  if (isCurrent) return 'Now';
  const time = parseISO(fromIso);
  const clock = formatLondonTime(time);
  const day = londonDayLabel(time, now);
  if (day === '') return clock;
  if (!isPast && day === 'tomorrow') return `Tomorrow ${clock}`;
  return `${formatLondonShortWeekday(time)} ${clock}`;
}

function buildVsNow(selected: number, current: number, isCurrent: boolean): string {
  if (isCurrent) return 'Live grid reading';
  const delta = selected - current;
  if (Math.abs(delta) < 8) return 'About the same as now';
  if (delta < 0) return `${Math.abs(delta)}g cleaner than now`;
  return `${delta}g dirtier than now`;
}

function buildAction(
  band: string,
  isPast: boolean,
  isCurrent: boolean,
  vsNowCleaner: boolean,
  inBestWindow: boolean,
  minutesUntil: number,
  nowAction?: NowOrWaitAction,
  laterLower = false,
): string {
  if (isPast) {
    return 'Past half hour. Handy for checking forecast vs actual.';
  }
  // The current hour must agree with the now-or-wait card above the chart.
  if (isCurrent && nowAction === 'wait') {
    return 'Cleaner hours are coming. Wait if you can.';
  }
  if (isCurrent && nowAction === 'use_now' && (band === 'high' || band === 'very high')) {
    return "Dirty half hour, but it won't get much cleaner soon.";
  }
  if (isCurrent && nowAction === 'use_now' && band === 'moderate') {
    return "Middling half hour, but it won't get much cleaner soon.";
  }
  if (inBestWindow) {
    if (isCurrent && !laterLower) {
      return 'This half hour is as clean as it gets. Good time to run a load.';
    }
    return isCurrent
      ? 'Good half hour for a load. A later slot is a touch cleaner.'
      : 'In a best window. A good slot to plan a load.';
  }
  if (band === 'very low' || band === 'low') {
    return isCurrent
      ? "Grid's clean this half hour. Go for big loads."
      : vsNowCleaner
        ? 'Cleaner than now. Worth moving a load here.'
        : 'Still a clean half hour on the grid.';
  }
  if (band === 'high' || band === 'very high') {
    if (isCurrent) return 'Dirty half hour. Wait if you can.';
    if (minutesUntil > 0 && minutesUntil < 18 * 60) {
      return 'Best not to start big loads in this half hour.';
    }
    return 'High-carbon half hour. Move it if you can.';
  }
  return isCurrent
    ? 'Middling half hour. Check the chart for a cleaner one.'
    : 'Moderate half hour. Check the slots either side.';
}

/**
 * Build Carrot-style cross-linked copy for a selected forecast hour.
 * Chart highlight + this insight should always agree.
 */
export function getForecastHourInsight(
  forecast: ForecastData[],
  selectedIndex: number,
  currentIntensity: number,
  tone: ConditionTone = 'plain',
  now: Date = new Date(),
  bestBlockIndexes: Set<number> = new Set(),
  /** The home card's answer, so the current-hour line never contradicts it. */
  nowAction?: NowOrWaitAction,
): ForecastHourInsight | null {
  if (!forecast.length || selectedIndex < 0 || selectedIndex >= forecast.length) {
    return null;
  }

  const item = forecast[selectedIndex];
  const time = parseISO(item.from);
  const to = parseISO(item.to);
  const isPast = isBefore(to, now);
  const isCurrent = !isBefore(now, time) && isBefore(now, to);
  const value = resolveValue(item, now);
  const band = resolveBand(item);
  const inBestWindow = bestBlockIndexes.has(selectedIndex);
  const minutesUntil = Math.max(0, differenceInMinutes(time, now));

  return {
    index: selectedIndex,
    timeLabel: buildTimeLabel(item.from, now, isCurrent, isPast),
    value,
    band,
    // Band name only: the Cheeky line is too long for the chart strip and would truncate.
    condition: getConditionParts(band, tone, item.from).band,
    vsNow: buildVsNow(value, currentIntensity, isCurrent),
    action: buildAction(
      band,
      isPast,
      isCurrent,
      value < currentIntensity - 7,
      inBestWindow,
      minutesUntil,
      nowAction,
      // True when any later slot is forecast lower than this one.
      forecast.slice(selectedIndex + 1).some((f) => f.intensity.forecast < value),
    ),
    inBestWindow,
    washClass: WASH[band] ?? WASH.moderate,
    isPast,
    isCurrent,
  };
}

/** Prefer the live half-hour slot; otherwise the next future slot; else 0. */
export function findDefaultForecastIndex(forecast: ForecastData[], now: Date = new Date()): number {
  if (!forecast.length) return 0;
  const currentIdx = forecast.findIndex((item) => {
    const from = parseISO(item.from);
    const to = parseISO(item.to);
    return !isBefore(now, from) && isBefore(now, to);
  });
  if (currentIdx >= 0) return currentIdx;
  const futureIdx = forecast.findIndex((item) => !isBefore(parseISO(item.from), now));
  return futureIdx >= 0 ? futureIdx : Math.max(0, forecast.length - 1);
}

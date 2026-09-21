import { format, parseISO, isBefore, differenceInMinutes } from 'date-fns';
import type { ForecastData } from '@/lib/carbonApi';
import { getConditionLabel, type ConditionTone } from '@/lib/conditionLabels';

export type ForecastHourInsight = {
  /** Forecast slot index into the array. */
  index: number;
  /** e.g. "Now", "14:00", "Yesterday 22:00" */
  timeLabel: string;
  /** gCO₂/kWh value shown for the slot (actual preferred when present). */
  value: number;
  /** National Grid intensity band for the slot. */
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

function resolveValue(item: ForecastData): number {
  return item.intensity.actual ?? item.intensity.forecast;
}

function resolveBand(item: ForecastData): string {
  return (item.intensity.index || 'moderate').toLowerCase();
}

function buildTimeLabel(fromIso: string, now: Date, isCurrent: boolean, isPast: boolean): string {
  if (isCurrent) return 'Now';
  const time = parseISO(fromIso);
  const sameDay = time.toDateString() === now.toDateString();
  const clock = format(time, 'HH:mm');
  if (sameDay) return clock;
  if (isPast) return format(time, 'EEE HH:mm');
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (time.toDateString() === tomorrow.toDateString()) return `Tomorrow ${clock}`;
  return format(time, 'EEE HH:mm');
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
): string {
  if (isPast) {
    return 'Past hour — useful for comparing forecast vs actual.';
  }
  if (inBestWindow) {
    return isCurrent
      ? 'Best window is open — good time to run a load.'
      : 'Inside a best window — plan a load for this slot.';
  }
  if (band === 'very low' || band === 'low') {
    return isCurrent
      ? 'Grid is clean — use energy freely.'
      : vsNowCleaner
        ? 'Cleaner than now — a solid shift target.'
        : 'Still a clean hour on the grid.';
  }
  if (band === 'high' || band === 'very high') {
    if (isCurrent) return 'Dirty hour — wait if you can.';
    if (minutesUntil > 0 && minutesUntil < 18 * 60) {
      return 'Avoid starting big loads in this slot.';
    }
    return 'Heavy carbon hour — shift if you can.';
  }
  return isCurrent
    ? 'Mid-pack hour — check the chart for a greener window.'
    : 'Moderate hour — look for a greener neighbour.';
}

/**
 * Build Carrot-style cross-linked copy for a selected forecast hour.
 * Chart highlight + this insight should always agree.
 */
export function getForecastHourInsight(
  forecast: ForecastData[],
  selectedIndex: number,
  currentIntensity: number,
  tone: ConditionTone = 'friendly',
  now: Date = new Date(),
  bestBlockIndexes: Set<number> = new Set(),
): ForecastHourInsight | null {
  if (!forecast.length || selectedIndex < 0 || selectedIndex >= forecast.length) {
    return null;
  }

  const item = forecast[selectedIndex];
  const time = parseISO(item.from);
  const to = parseISO(item.to);
  const isPast = isBefore(to, now);
  const isCurrent = !isBefore(now, time) && isBefore(now, to);
  const value = resolveValue(item);
  const band = resolveBand(item);
  const inBestWindow = bestBlockIndexes.has(selectedIndex);
  const minutesUntil = Math.max(0, differenceInMinutes(time, now));

  return {
    index: selectedIndex,
    timeLabel: buildTimeLabel(item.from, now, isCurrent, isPast),
    value,
    band,
    condition: getConditionLabel(band, tone, item.from),
    vsNow: buildVsNow(value, currentIntensity, isCurrent),
    action: buildAction(
      band,
      isPast,
      isCurrent,
      value < currentIntensity - 7,
      inBestWindow,
      minutesUntil,
    ),
    inBestWindow,
    washClass: WASH[band] ?? WASH.moderate,
    isPast,
    isCurrent,
  };
}

/** Prefer the live half-hour slot; otherwise the next future slot; else 0. */
export function findDefaultForecastIndex(
  forecast: ForecastData[],
  now: Date = new Date(),
): number {
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

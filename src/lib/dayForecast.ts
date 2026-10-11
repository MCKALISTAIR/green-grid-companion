import type { ForecastData } from '@/lib/carbonApi';
import { LONDON_TZ, formatLondonTime, londonDateKey } from '@/lib/londonTime';
import { classifySpread, type SpreadKind } from '@/lib/forecastWindows';

/**
 * Pure helpers for the 48-hour overview cards.
 *
 * Everything is bucketed by the Europe/London calendar day, whatever timezone
 * the device is in (DST days have 46 or 50 half-hours, not 48).
 */

export const SLOT_MS = 30 * 60_000;

type IntensityIndex = ForecastData['intensity']['index'];

function isUsable(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

// ---------------------------------------------------------------------------
// London calendar maths
// ---------------------------------------------------------------------------

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** London UTC offset in ms at an instant (0 in winter, +1h in summer). */
export function londonOffsetMs(instant: number): number {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
  );
  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
  );
  return wall - Math.floor(instant / 60_000) * 60_000;
}

/** Instant of a London wall-clock time on a London date ("2026-10-25", 6) -> ms. */
export function londonWallTimeToInstant(dateKey: string, hour: number, minute = 0): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  let instant = guess - londonOffsetMs(guess);
  // Second pass settles times right after a DST switch.
  instant = guess - londonOffsetMs(instant);
  return instant;
}

export interface DayBounds {
  start: number;
  end: number;
  /** Half-hours in this London day: 48, or 46/50 on DST change days. */
  slotCount: number;
}

/** Start (inclusive) and end (exclusive) of a London calendar day. */
export function londonDayBounds(dateKey: string): DayBounds {
  const [y, m, d] = dateKey.split('-').map(Number);
  const start = londonWallTimeToInstant(dateKey, 0);
  const nextKey = londonDateKey(new Date(Date.UTC(y, m - 1, d + 1, 12)));
  const end = londonWallTimeToInstant(nextKey, 0);
  return { start, end, slotCount: Math.round((end - start) / SLOT_MS) };
}

/** Tick instants at the given London hours (default 00, 06, 12, 18). */
export function londonDayTicks(dateKey: string, hours: number[] = [0, 6, 12, 18]): number[] {
  return hours.map((h) => londonWallTimeToInstant(dateKey, h));
}

const weekdayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON_TZ, weekday: 'long' });
const dayMonthFmt = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON_TZ, day: 'numeric', month: 'short' });

/** "Sunday 11 Oct" for a London date key. */
export function formatDayTitle(dateKey: string): string {
  const noon = londonWallTimeToInstant(dateKey, 12);
  return `${weekdayFmt.format(noon)} ${dayMonthFmt.format(noon)}`;
}

/** "Today", "Tomorrow", "Yesterday" or the weekday, relative to `now` in London. */
export function relativeDayLabel(dateKey: string, now: Date = new Date()): string {
  const todayKey = londonDateKey(now);
  const [y, m, d] = todayKey.split('-').map(Number);
  const shift = (n: number) => londonDateKey(new Date(Date.UTC(y, m - 1, d + n, 12)));
  if (dateKey === todayKey) return 'Today';
  if (dateKey === shift(1)) return 'Tomorrow';
  return weekdayFmt.format(londonWallTimeToInstant(dateKey, 12));
}

// ---------------------------------------------------------------------------
// Overview cards
// ---------------------------------------------------------------------------

export interface DailyStats {
  date: string;
  label: string;
  /** null = no usable forecast values that day (show "No data yet", never 0). */
  min: number | null;
  max: number | null;
  avg: number | null;
  minActual: number | null;
  maxActual: number | null;
  avgActual: number | null;
  hasActuals: boolean;
  /** Past values were calculated by GridSense from the fuel mix, not published by NESO. */
  actualsEstimated: boolean;
  /** Every forecast value that day is exactly 0 (NESO's regional model does this for wind/nuclear-heavy regions). */
  allZero: boolean;
  /** Same classification the Now-or-wait card and Planner use (null = no data). */
  spread: SpreadKind | null;
}

function stats(values: number[]) {
  if (values.length === 0) return { min: null, max: null, avg: null };
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  };
}

/** Group the forecast into London days for the 48-hour overview cards. */
export function getDailyStats(forecast: ForecastData[], now: Date = new Date()): DailyStats[] {
  const todayKey = londonDateKey(now);
  const grouped = new Map<string, { forecast: number[]; actual: number[]; estimated: boolean }>();

  for (const item of forecast) {
    const fromMs = Date.parse(item.from);
    if (!Number.isFinite(fromMs)) continue;
    const key = londonDateKey(new Date(fromMs));
    let group = grouped.get(key);
    if (!group) {
      group = { forecast: [], actual: [], estimated: false };
      grouped.set(key, group);
    }
    const f = item.intensity?.forecast;
    if (isUsable(f)) group.forecast.push(f);
    const a = item.intensity?.actual;
    if (isUsable(a)) {
      group.actual.push(a);
      if (item.intensity.actualEstimated) group.estimated = true;
    }
  }

  const result: DailyStats[] = [];
  grouped.forEach((values, date) => {
    const f = stats(values.forecast);
    const isPastDay = date < todayKey;
    const hasActuals = isPastDay && values.actual.length > 0;
    const a = hasActuals ? stats(values.actual) : { min: null, max: null, avg: null };
    result.push({
      date,
      label: relativeDayLabel(date, now),
      min: f.min,
      max: f.max,
      avg: f.avg,
      minActual: a.min,
      maxActual: a.max,
      avgActual: a.avg,
      hasActuals,
      actualsEstimated: hasActuals && values.estimated,
      allZero: values.forecast.length > 0 && values.forecast.every((v) => v === 0),
      spread: classifySpread(values.forecast),
    });
  });

  return result.sort((x, y) => x.date.localeCompare(y.date));
}

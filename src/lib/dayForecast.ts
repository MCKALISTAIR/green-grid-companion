import type { ForecastData } from '@/lib/carbonApi';
import { LONDON_TZ, formatLondonTime, londonDateKey } from '@/lib/londonTime';
import { findCleanestWindow, type LoadWindow } from '@/lib/nowOrWait';
import { MIN_GRAMS_CLEANER } from '@/lib/forecastWindows';

/**
 * Pure helpers for the 48-hour overview cards and the day-detail chart.
 *
 * Everything is bucketed by the Europe/London calendar day, whatever timezone
 * the device is in, and laid out on real time so DST days get 46 or 50
 * half-hours instead of a drifting 48.
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
    });
  });

  return result.sort((x, y) => x.date.localeCompare(y.date));
}

// ---------------------------------------------------------------------------
// Day detail chart
// ---------------------------------------------------------------------------

export interface DaySlot {
  /** Slot start (ms). */
  from: number;
  to: number;
  /** Chart x: slot midpoint (ms). */
  x: number;
  time: string;
  forecast: number | null;
  /** NESO-published actual (GB only). Always null for regions. */
  actual: number | null;
  index: IntensityIndex | null;
}

export interface DayDetail {
  dateKey: string;
  bounds: DayBounds;
  slots: DaySlot[];
  hasActualLine: boolean;
  /** Half-hours with a forecast value. */
  filledCount: number;
  /** Missing slots between the first and last value (true gaps). */
  internalGaps: number;
  /** Slots after the last value on a day that hasn't finished (forecast horizon). */
  missingAfterHorizon: number;
  min: number | null;
  max: number | null;
  cleanest: LoadWindow | null;
  cleanestSlot: DaySlot | null;
  dirtiest: DaySlot | null;
  /** Spread is big enough to be worth marking cleanest/dirtiest. */
  showExtremes: boolean;
  allZero: boolean;
  nowIndex: number | null;
}

export interface BuildDayDetailOptions {
  /** Draw a NESO actual line (GB only). Regional "actuals" are never drawn. */
  includeActual: boolean;
  now?: Date;
}

/** Lay one London day out as every half-hour, with null for missing values. */
export function buildDayDetail(
  items: ForecastData[],
  dateKey: string,
  { includeActual, now = new Date() }: BuildDayDetailOptions,
): DayDetail {
  const bounds = londonDayBounds(dateKey);
  const byStart = new Map<number, ForecastData>();
  for (const item of items) {
    const from = Date.parse(item.from);
    if (!Number.isFinite(from) || from < bounds.start || from >= bounds.end) continue;
    if (!byStart.has(from)) byStart.set(from, item);
  }

  const slots: DaySlot[] = [];
  for (let i = 0; i < bounds.slotCount; i++) {
    const from = bounds.start + i * SLOT_MS;
    const item = byStart.get(from);
    const f = item?.intensity?.forecast;
    const a = item?.intensity?.actual;
    slots.push({
      from,
      to: from + SLOT_MS,
      x: from + SLOT_MS / 2,
      time: formatLondonTime(new Date(from)),
      forecast: isUsable(f) ? f : null,
      actual: includeActual && isUsable(a) && !item?.intensity?.actualEstimated ? a : null,
      index: item?.intensity?.index ?? null,
    });
  }

  const filled = slots.filter((s) => s.forecast !== null);
  const firstIdx = slots.findIndex((s) => s.forecast !== null);
  let lastIdx = -1;
  for (let i = slots.length - 1; i >= 0; i--) if (slots[i].forecast !== null) { lastIdx = i; break; }

  const nowMs = now.getTime();
  const dayFinished = nowMs >= bounds.end;
  let internalGaps = 0;
  let missingAfterHorizon = 0;
  if (firstIdx >= 0) {
    for (let i = firstIdx; i <= lastIdx; i++) if (slots[i].forecast === null) internalGaps++;
    // Leading gaps on a past/today chart are real gaps too.
    internalGaps += firstIdx;
    const trailing = slots.length - 1 - lastIdx;
    if (dayFinished) internalGaps += trailing;
    else missingAfterHorizon = trailing;
  }

  const values = filled.map((s) => s.forecast as number);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;

  const nowIndex = nowMs >= bounds.start && nowMs < bounds.end
    ? Math.floor((nowMs - bounds.start) / SLOT_MS)
    : null;

  // Today: only windows from the current half hour on, like the home card.
  const fromMs = nowIndex !== null ? bounds.start + nowIndex * SLOT_MS : bounds.start;
  const forecastForWindow: ForecastData[] = slots
    .filter((s) => s.forecast !== null)
    .map((s) => ({
      from: new Date(s.from).toISOString(),
      to: new Date(s.to).toISOString(),
      intensity: { forecast: s.forecast as number, index: s.index ?? 'moderate' },
    }));
  const cleanest = findCleanestWindow(forecastForWindow, { fromMs, toMs: bounds.end });

  let cleanestSlot: DaySlot | null = null;
  let dirtiest: DaySlot | null = null;
  for (const s of filled) {
    if (!cleanestSlot || (s.forecast as number) < (cleanestSlot.forecast as number)) cleanestSlot = s;
    if (!dirtiest || (s.forecast as number) > (dirtiest.forecast as number)) dirtiest = s;
  }

  const showExtremes = min !== null && max !== null && max - min >= MIN_GRAMS_CLEANER;

  return {
    dateKey,
    bounds,
    slots,
    hasActualLine: includeActual && slots.some((s) => s.actual !== null),
    filledCount: filled.length,
    internalGaps,
    missingAfterHorizon,
    min,
    max,
    cleanest: showExtremes ? cleanest : null,
    cleanestSlot,
    dirtiest: showExtremes ? dirtiest : null,
    showExtremes,
    allZero: values.length > 0 && values.every((v) => v === 0),
    nowIndex,
  };
}

/** "13:00–16:00" (en dash). */
export function formatWindow(w: Pick<LoadWindow, 'start' | 'end'>): string {
  return `${formatLondonTime(w.start)}\u2013${formatLondonTime(w.end)}`;
}

/** Screen-reader / caption summary, e.g. "Forecast from 82 to 214, cleanest 13:00–16:00". */
export function summariseDay(detail: DayDetail): string {
  if (detail.min === null || detail.max === null) return 'No forecast values for this day.';
  const parts = [
    detail.min === detail.max
      ? `Forecast ${detail.min} gCO\u2082/kWh all day`
      : `Forecast from ${detail.min} to ${detail.max} gCO\u2082/kWh`,
  ];
  if (detail.cleanest) parts.push(`cleanest ${formatWindow(detail.cleanest)}`);
  if (detail.dirtiest) parts.push(`dirtiest ${detail.dirtiest.time}`);
  return `${parts.join(', ')}.`;
}

/** Default scrub/readout index: now for today, else the cleanest half-hour. */
export function defaultIndex(detail: DayDetail): number | null {
  if (detail.nowIndex !== null && detail.slots[detail.nowIndex]?.forecast !== null) return detail.nowIndex;
  if (detail.cleanestSlot) return detail.slots.indexOf(detail.cleanestSlot);
  return null;
}

/** Y domain padded around the data; flat days get a sensible band. */
export function yDomain(min: number | null, max: number | null): [number, number] {
  if (min === null || max === null) return [0, 100];
  const range = max - min;
  if (range < 10) return [Math.max(0, min - 25), max + 25];
  const pad = range * 0.12;
  return [Math.max(0, min - pad), max + pad];
}

// ---------------------------------------------------------------------------
// Chip layout
// ---------------------------------------------------------------------------

export interface ChipInput {
  id: string;
  /** Desired centre x in px. */
  x: number;
  width: number;
}

export interface PlacedChip extends ChipInput {
  left: number;
  lane: number;
}

/**
 * Place chips centred on their x, clamped inside [0, containerWidth], and
 * stack them into lanes so no two chips in the same lane overlap.
 */
export function layoutChips(chips: ChipInput[], containerWidth: number, gap = 4): PlacedChip[] {
  const lanes: Array<Array<[number, number]>> = [];
  const sorted = [...chips].sort((a, b) => a.x - b.x);
  const placed: PlacedChip[] = [];
  for (const chip of sorted) {
    const left = Math.min(Math.max(0, chip.x - chip.width / 2), Math.max(0, containerWidth - chip.width));
    const right = left + chip.width;
    let lane = 0;
    while (lanes[lane]?.some(([l, r]) => left < r + gap && right + gap > l)) lane++;
    (lanes[lane] ??= []).push([left, right]);
    placed.push({ ...chip, left, lane });
  }
  return chips.map((c) => placed.find((p) => p.id === c.id)!);
}

/** Text the slider reads out for one half-hour. */
export function slotValueText(detail: DayDetail, index: number): string {
  const slot = detail.slots[index];
  if (!slot) return '';
  if (slot.forecast === null) return `${slot.time}, no data`;
  const actual = slot.actual !== null ? `, actual ${slot.actual}` : '';
  return `${slot.time}, forecast ${slot.forecast} gCO\u2082/kWh${actual}`;
}

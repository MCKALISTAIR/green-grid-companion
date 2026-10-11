import type { ForecastData } from '@/lib/carbonApi';
import { LONDON_TZ, formatLondonTime, londonDateKey } from '@/lib/londonTime';
import { classifySpread, type SpreadKind } from '@/lib/forecastWindows';
import { findCleanestWindow, type LoadWindow } from '@/lib/nowOrWait';
import { isEstimatedActual } from '@/lib/carbonApi';

/**
 * Pure helpers for the 48-hour overview cards, the day sheet and History.
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

// ---------------------------------------------------------------------------
// Day detail (day sheet and History "Day")
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
  /** GridSense estimate from the fuel mix (regions, ended half hours). Labelled "Est". */
  estimate: number | null;
  index: IntensityIndex | null;
}

export interface DayDetail {
  dateKey: string;
  bounds: DayBounds;
  slots: DaySlot[];
  hasActualLine: boolean;
  hasEstimateLine: boolean;
  /** Half-hours with a forecast value. */
  filledCount: number;
  /** Missing slots between the first and last value (true gaps). */
  internalGaps: number;
  /** Slots after the last value on a day that hasn't finished (forecast horizon). */
  missingAfterHorizon: number;
  /** Forecast min/max. */
  min: number | null;
  max: number | null;
  /** Average of the forecast values. */
  avg: number | null;
  /** Min/max over every drawn series (forecast plus Actual or Est). */
  plottedMin: number | null;
  plottedMax: number | null;
  spread: SpreadKind | null;
  /** Cleanest 3-hour window inside the day (from now on, for today). */
  cleanest: LoadWindow | null;
  cleanestSlot: DaySlot | null;
  dirtiest: DaySlot | null;
  /** Spread is "varied", so cleanest/dirtiest are worth marking. */
  showExtremes: boolean;
  allZero: boolean;
  nowIndex: number | null;
}

export interface BuildDayDetailOptions {
  /** Draw NESO's actual (GB). Regions draw GridSense's Est instead. */
  includeActual: boolean;
  /** Draw GridSense's Est line (regions). Defaults to !includeActual. */
  includeEstimate?: boolean;
  now?: Date;
}

/** Lay one London day out as every half-hour, with null for missing values. */
export function buildDayDetail(
  items: ForecastData[],
  dateKey: string,
  { includeActual, includeEstimate = !includeActual, now = new Date() }: BuildDayDetailOptions,
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
    const estimated = !!item && isEstimatedActual(item);
    slots.push({
      from,
      to: from + SLOT_MS,
      x: from + SLOT_MS / 2,
      time: formatLondonTime(new Date(from)),
      forecast: isUsable(f) ? f : null,
      actual: includeActual && isUsable(a) && !estimated ? a : null,
      estimate: includeEstimate && isUsable(a) && estimated ? a : null,
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
    internalGaps += firstIdx;
    const trailing = slots.length - 1 - lastIdx;
    if (dayFinished) internalGaps += trailing;
    else missingAfterHorizon = trailing;
  }

  const values = filled.map((s) => s.forecast as number);
  const f = stats(values);
  const plotted = [
    ...values,
    ...slots.map((s) => s.actual).filter(isUsable),
    ...slots.map((s) => s.estimate).filter(isUsable),
  ];
  const spread = classifySpread(values);

  const nowIndex = nowMs >= bounds.start && nowMs < bounds.end
    ? Math.floor((nowMs - bounds.start) / SLOT_MS)
    : null;

  // Today: only windows from the current half hour on, like the home card.
  const fromMs = nowIndex !== null ? bounds.start + nowIndex * SLOT_MS : bounds.start;
  const forecastForWindow: ForecastData[] = filled.map((s) => ({
    from: new Date(s.from).toISOString(),
    to: new Date(s.to).toISOString(),
    intensity: { forecast: s.forecast as number, index: s.index ?? 'moderate' },
  }));
  const cleanest = dayFinished ? null : findCleanestWindow(forecastForWindow, { fromMs, toMs: bounds.end });

  let cleanestSlot: DaySlot | null = null;
  let dirtiest: DaySlot | null = null;
  for (const s of filled) {
    if (!cleanestSlot || (s.forecast as number) < (cleanestSlot.forecast as number)) cleanestSlot = s;
    if (!dirtiest || (s.forecast as number) > (dirtiest.forecast as number)) dirtiest = s;
  }

  const showExtremes = spread === 'varied';

  return {
    dateKey,
    bounds,
    slots,
    hasActualLine: includeActual && slots.some((s) => s.actual !== null),
    hasEstimateLine: includeEstimate && slots.some((s) => s.estimate !== null),
    filledCount: filled.length,
    internalGaps,
    missingAfterHorizon,
    min: f.min,
    max: f.max,
    avg: f.avg,
    plottedMin: plotted.length ? Math.min(...plotted) : null,
    plottedMax: plotted.length ? Math.max(...plotted) : null,
    spread,
    cleanest: showExtremes ? cleanest : null,
    cleanestSlot,
    dirtiest: showExtremes ? dirtiest : null,
    showExtremes,
    allZero: values.length > 0 && values.every((v) => v === 0),
    nowIndex,
  };
}

/** "13:00–16:00" (en dash, no spaces). */
export function formatWindow(w: Pick<LoadWindow, 'start' | 'end'>): string {
  return `${formatLondonTime(w.start)}\u2013${formatLondonTime(w.end)}`;
}

/** Screen-reader summary, e.g. "Forecast from 82 to 214 gCO₂/kWh. Cleanest 3 hours: 13:00 to 16:00, around 90." */
export function summariseDay(detail: DayDetail): string {
  if (detail.min === null || detail.max === null) return 'No forecast for this day yet.';
  if (detail.allZero) return 'Forecast: zero carbon all day.';
  const parts = [
    detail.min === detail.max
      ? `Forecast ${detail.min} gCO\u2082/kWh all day.`
      : `Forecast from ${detail.min} to ${detail.max} gCO\u2082/kWh.`,
  ];
  if (detail.cleanest) {
    parts.push(
      `Cleanest 3 hours: ${formatLondonTime(detail.cleanest.start)} to ${formatLondonTime(detail.cleanest.end)}, around ${detail.cleanest.avg}.`,
    );
  }
  if (detail.dirtiest) parts.push(`Highest ${detail.dirtiest.forecast} at ${detail.dirtiest.time}.`);
  return parts.join(' ');
}

/** Default scrub/readout index: now for today, else the cleanest half-hour. */
export function defaultIndex(detail: DayDetail): number | null {
  if (detail.nowIndex !== null && detail.slots[detail.nowIndex]?.forecast !== null) return detail.nowIndex;
  if (detail.cleanestSlot) return detail.slots.indexOf(detail.cleanestSlot);
  return null;
}

/**
 * Y domain (spec §3.2). Ranges of 50 g or more get 12% padding; anything
 * smaller is shown on a 50 g window centred on the data (floor 0), so a flat
 * 0 day sits on the baseline of a 0–50 axis instead of being stretched.
 */
export function yDomain(min: number | null, max: number | null): [number, number] {
  if (min === null || max === null) return [0, 50];
  const range = max - min;
  if (range >= 50) {
    const pad = range * 0.12;
    return [Math.max(0, min - pad), max + pad];
  }
  const lo = Math.max(0, (min + max) / 2 - 25);
  return [lo, lo + 50];
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

const BAND_NAME: Record<string, string> = {
  'very low': 'very low',
  low: 'low',
  moderate: 'moderate',
  high: 'high',
  'very high': 'very high',
};

/** Slider value text: "13:00, forecast 146 gCO₂/kWh, moderate" (+ ", Actual 140" / ", Est 2"). */
export function slotValueText(
  slot: Pick<DaySlot, 'time' | 'forecast' | 'actual' | 'estimate' | 'index'> | undefined,
): string {
  if (!slot) return '';
  if (slot.forecast === null) return `${slot.time}, no data`;
  const band = slot.index ? `, ${BAND_NAME[slot.index] ?? slot.index}` : '';
  const extra = slot.actual !== null ? `, Actual ${slot.actual}` : slot.estimate !== null ? `, Est ${slot.estimate}` : '';
  return `${slot.time}, forecast ${slot.forecast} gCO\u2082/kWh${band}${extra}`;
}

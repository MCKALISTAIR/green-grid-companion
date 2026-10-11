import type { ForecastData } from '@/lib/carbonApi';
import {
  MIN_GRAMS_CLEANER,
  MIN_PERCENT_CLEANER,
  OPTIMAL_WINDOW_SLOTS,
} from '@/lib/forecastWindows';
import { formatLondonTime, londonDayLabel } from '@/lib/londonTime';

/**
 * Now-or-wait planning engine.
 *
 * One pure function (`planLoad`) compares "start this load now" with the
 * cleanest later start inside a horizon, and returns one answer. The home
 * card (`getNowOrWaitDecision`), the Power Planner and the forecast chart
 * strip all read from it, so they can't disagree with each other.
 */

/** Look this far ahead on the home card so we never ask people to wait days. */
export const DECISION_HORIZON_HOURS = 18;

export { MIN_PERCENT_CLEANER, MIN_GRAMS_CLEANER };

/** Home card plans a typical 3-hour load (dishwasher, wash cycle). */
export const HOME_LOAD_SLOTS = OPTIMAL_WINDOW_SLOTS;

const SLOT_MS = 30 * 60_000;

export type NowOrWaitAction = 'use_now' | 'wait' | 'check_forecast';

/**
 * Why the engine landed where it did.
 * - no_forecast: nothing usable to compare against
 * - now_is_best: starting now is the cleanest option (includes ties)
 * - small_gain: a later start is a bit cleaner, but under the threshold
 * - cleaner_later: a later start is meaningfully cleaner, so wait
 */
export type NowOrWaitReason = 'no_forecast' | 'now_is_best' | 'small_gain' | 'cleaner_later';

export interface LoadWindow {
  start: Date;
  end: Date;
  avg: number;
}

export interface LoadPlan {
  action: NowOrWaitAction;
  reason: NowOrWaitReason;
  /** Average gCO₂/kWh if the load starts now (null when unknown). */
  nowAvg: number | null;
  /** Cleanest later start found (null when there isn't one). */
  best: LoadWindow | null;
  /** Rounded percent cleaner than starting now (0 unless best is cleaner). */
  percentCleaner: number;
  /** gCO₂/kWh cleaner than starting now (0 unless best is cleaner). */
  gramsCleaner: number;
  /** Minutes from now until `best.start` (0 when not waiting). */
  waitMinutes: number;
  /** How many hours of forecast the answer is based on. */
  coveredHours: number;
  /** True when the forecast is shorter than the requested horizon. */
  partial: boolean;
}

export interface PlanLoadOptions {
  forecast: ForecastData[] | null | undefined;
  /** Live gCO₂/kWh for the current half hour, preferred over the forecast. */
  liveIntensity?: number | null;
  now?: Date;
  /** Load length in 30-minute slots. */
  slots?: number;
  /** Only consider starts before now + this many hours. null = whole forecast. */
  horizonHours?: number | null;
}

interface Slot {
  from: number;
  to: number;
  value: number;
}

function isUsableNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

function toSlots(forecast: ForecastData[]): Slot[] {
  const out: Slot[] = [];
  for (const f of forecast) {
    const from = Date.parse(f.from);
    const to = Date.parse(f.to);
    const value = f.intensity?.forecast;
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue;
    if (!isUsableNumber(value)) continue;
    out.push({ from, to, value });
  }
  out.sort((a, b) => a.from - b.from);
  // Drop duplicate slots (same start), keeping the first.
  return out.filter((s, i) => i === 0 || s.from !== out[i - 1].from);
}

/** Average of `len` contiguous slots starting at `i`, or null if there's a gap. */
function windowAvg(slots: Slot[], i: number, len: number, firstValue?: number): number | null {
  if (i + len > slots.length) return null;
  let sum = 0;
  for (let j = 0; j < len; j++) {
    const s = slots[i + j];
    if (j > 0 && s.from !== slots[i + j - 1].to) return null;
    sum += j === 0 && firstValue !== undefined ? firstValue : s.value;
  }
  return sum / len;
}

/**
 * Cleanest contiguous window of `len` slots whose start is at index >= `startIdx`
 * and before `startBefore` (ms). Earliest wins ties; windows with a gap are skipped.
 * Shared by planLoad and findCleanestWindow so the home card and the day chart
 * can never pick different windows from the same data.
 */
function scanCleanest(
  slots: Slot[],
  startIdx: number,
  startBefore: number,
  len: number,
  mustEndBy: number = Infinity,
): { i: number; avg: number } | null {
  let best: { i: number; avg: number } | null = null;
  for (let i = Math.max(0, startIdx); i < slots.length; i++) {
    if (slots[i].from >= startBefore) break;
    if (i + len - 1 >= slots.length || slots[i + len - 1].to > mustEndBy) continue;
    const avg = windowAvg(slots, i, len);
    if (avg === null) continue;
    if (!best || avg < best.avg) best = { i, avg };
  }
  return best;
}

export interface FindCleanestWindowOptions {
  /** Window must start at or after this instant (ms). */
  fromMs: number;
  /** Window must end by this instant (ms), e.g. the end of a London day. */
  toMs: number;
  /** Load length in 30-minute slots (defaults to the home card's 3 hours). */
  slots?: number;
}

/**
 * Cleanest `slots`-long window fully inside [fromMs, toMs], using exactly the
 * same scoring as the Now-or-wait card (forecast values, gaps break a window,
 * earliest wins ties). Returns null when no complete window fits.
 */
export function findCleanestWindow(
  forecast: ForecastData[] | null | undefined,
  { fromMs, toMs, slots: len = HOME_LOAD_SLOTS }: FindCleanestWindowOptions,
): LoadWindow | null {
  const all = toSlots(forecast ?? []).filter((s) => s.from >= fromMs && s.to <= toMs);
  if (all.length < len) return null;
  const best = scanCleanest(all, 0, toMs, len, toMs);
  if (!best) return null;
  return {
    start: new Date(all[best.i].from),
    end: new Date(all[best.i + len - 1].to),
    avg: Math.round(best.avg),
  };
}

function emptyPlan(nowAvg: number | null): LoadPlan {
  return {
    action: 'check_forecast',
    reason: 'no_forecast',
    nowAvg,
    best: null,
    percentCleaner: 0,
    gramsCleaner: 0,
    waitMinutes: 0,
    coveredHours: 0,
    partial: true,
  };
}

/**
 * Decide whether to start a load now or wait, from the real forecast.
 * Pure: same inputs, same answer.
 */
export function planLoad({
  forecast,
  liveIntensity = null,
  now = new Date(),
  slots: requestedSlots = HOME_LOAD_SLOTS,
  horizonHours = DECISION_HORIZON_HOURS,
}: PlanLoadOptions): LoadPlan {
  const nowMs = now.getTime();
  const live = isUsableNumber(liveIntensity) ? liveIntensity : null;
  const all = toSlots(forecast ?? []);
  const upcoming = all.filter((s) => s.to > nowMs);

  if (upcoming.length === 0) return emptyPlan(live);

  const horizonEnd = horizonHours == null ? Infinity : nowMs + horizonHours * 3600_000;
  // Slots we can use: everything up to the horizon (a load may run past it,
  // but it must *start* before it).
  const lastUsefulTo = upcoming[upcoming.length - 1].to;
  const coveredMs = Math.min(lastUsefulTo, horizonEnd) - nowMs;
  const coveredHours = Math.max(0, Math.round((coveredMs / 3600_000) * 2) / 2);
  const partial = horizonHours != null && lastUsefulTo < horizonEnd - SLOT_MS;

  // Partial forecast: shrink the load window so there's still something
  // later to compare with. Full forecasts (~96 slots) are unaffected.
  const len = Math.max(
    1,
    Math.min(Math.round(requestedSlots), Math.floor(upcoming.length / 2)),
  );

  // "Start now" option.
  const current = upcoming[0].from <= nowMs ? 0 : -1;
  let nowAvg: number | null = null;
  if (current === 0) {
    nowAvg = windowAvg(upcoming, 0, len, live ?? undefined);
    if (nowAvg === null) nowAvg = live ?? upcoming[0].value;
  } else if (live !== null) {
    nowAvg = live;
  }
  if (nowAvg === null) return emptyPlan(null);

  // Cleanest later start (earliest wins ties).
  const best = scanCleanest(upcoming, current === 0 ? 1 : 0, horizonEnd, len);

  const roundedNow = Math.round(nowAvg);
  const base: LoadPlan = {
    action: 'use_now',
    reason: 'now_is_best',
    nowAvg: roundedNow,
    best: null,
    percentCleaner: 0,
    gramsCleaner: 0,
    waitMinutes: 0,
    coveredHours,
    partial,
  };

  if (!best) {
    // Nothing after the current half hour to compare with: that's a partial
    // forecast, not proof that now is best.
    const laterSlots = upcoming.length - (current === 0 ? 1 : 0);
    return laterSlots === 0 ? emptyPlan(roundedNow) : base;
  }

  const bestWindow: LoadWindow = {
    start: new Date(upcoming[best.i].from),
    end: new Date(upcoming[best.i + len - 1].to),
    avg: Math.round(best.avg),
  };
  const grams = roundedNow - bestWindow.avg;

  if (grams <= 0) return { ...base, best: bestWindow };

  const percent = roundedNow > 0 ? (grams / roundedNow) * 100 : 0;
  const worthWaiting = percent >= MIN_PERCENT_CLEANER && grams >= MIN_GRAMS_CLEANER;

  if (!worthWaiting) {
    return {
      ...base,
      reason: 'small_gain',
      best: bestWindow,
      percentCleaner: Math.round(percent),
      gramsCleaner: grams,
    };
  }

  return {
    ...base,
    action: 'wait',
    reason: 'cleaner_later',
    best: bestWindow,
    percentCleaner: Math.round(percent),
    gramsCleaner: grams,
    waitMinutes: Math.max(0, Math.round((bestWindow.start.getTime() - nowMs) / 60_000)),
  };
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** "about 20 minutes", "about an hour", "about 2.5 hours". */
export function describeWait(minutes: number): string {
  if (minutes < 45) {
    const m = Math.max(5, Math.round(minutes / 5) * 5);
    return `about ${m} minutes`;
  }
  const halfHours = Math.round(minutes / 30);
  const hours = halfHours / 2;
  if (hours === 1) return 'about an hour';
  return `about ${hours} hours`;
}

/** "the next hour", "the next 18 hours". */
export function describeSpan(hours: number): string {
  if (hours < 1.5) return 'the next hour';
  return `the next ${Math.floor(hours)} hours`;
}

/** Round a percent to the nearest 5 for "around X%" copy. */
export function roundPercent(percent: number): number {
  return Math.max(5, Math.round(percent / 5) * 5);
}

function describeRange(start: Date, end: Date, now: Date): string {
  const day = londonDayLabel(start, now);
  const range = `from ${formatLondonTime(start)} to ${formatLondonTime(end)}`;
  return day ? `${range} ${day}` : range;
}

export interface NowOrWaitDecision {
  action: NowOrWaitAction;
  reason: NowOrWaitReason;
  headline: string;
  detail: string;
  tip: string;
  windowStart: Date | null;
  windowEnd: Date | null;
  windowAvg: number | null;
  countdownTarget: Date | null;
  plan: LoadPlan;
}

const UNIT = 'gCO₂/kWh';

/**
 * Home-card answer to "use energy now or wait?" for a 3-hour load.
 * Headline, detail, tip and countdown all come from the same plan.
 */
export function getNowOrWaitDecision(
  intensity: number | null | undefined,
  forecast: ForecastData[] | null | undefined,
  now: Date = new Date(),
): NowOrWaitDecision {
  const plan = planLoad({ forecast, liveIntensity: intensity, now });
  const loadHours = HOME_LOAD_SLOTS / 2;
  const basis = plan.partial
    ? `Based on the ${plan.coveredHours === 1 ? '1 hour' : `${plan.coveredHours} hours`} of forecast we have so far.`
    : `Based on a ${loadHours}-hour load, like a wash cycle or the dishwasher.`;

  const common = {
    action: plan.action,
    reason: plan.reason,
    windowStart: plan.best?.start ?? null,
    windowEnd: plan.best?.end ?? null,
    windowAvg: plan.best?.avg ?? null,
    countdownTarget: null as Date | null,
    plan,
  };

  switch (plan.reason) {
    case 'no_forecast':
      return {
        ...common,
        headline: 'Forecast not in yet',
        detail:
          plan.nowAvg !== null
            ? `It's ${plan.nowAvg} ${UNIT} right now. We can't compare that with later until the forecast loads.`
            : "We can't compare now with later until the forecast loads.",
        tip: 'Pull down to refresh, or check back in a few minutes.',
      };

    case 'cleaner_later': {
      const best = plan.best!;
      return {
        ...common,
        headline: `Wait ${describeWait(plan.waitMinutes)}`,
        detail: `It'll be around ${roundPercent(plan.percentCleaner)}% cleaner (${plan.nowAvg} to ${best.avg} ${UNIT}) ${describeRange(best.start, best.end, now)}.`,
        tip: basis,
        countdownTarget: best.start,
      };
    }

    case 'small_gain':
      return {
        ...common,
        headline: "Now's good",
        detail: `It won't get much cleaner in ${describeSpan(plan.coveredHours)}. Starting now averages around ${plan.nowAvg} ${UNIT}, and the best later start is around ${plan.best!.avg}.`,
        tip: basis,
      };

    case 'now_is_best':
    default:
      return {
        ...common,
        headline: "Now's good",
        detail: `It won't get any cleaner in ${describeSpan(plan.coveredHours)}. Starting now averages around ${plan.nowAvg} ${UNIT}.`,
        tip: basis,
      };
  }
}

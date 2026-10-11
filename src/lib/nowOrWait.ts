import type { ForecastData } from '@/lib/carbonApi';
import {
  MIN_GRAMS_CLEANER,
  MIN_PERCENT_CLEANER,
  OPTIMAL_WINDOW_SLOTS,
  classifySpread,
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

const UNIT = 'gCO₂/kWh';

export type NowOrWaitAction = 'use_now' | 'wait' | 'check_forecast';

/**
 * Why the engine landed where it did.
 * - no_forecast: nothing usable to compare against
 * - now_is_best: starting now is the cleanest option (includes ties)
 * - small_gain: a later start is a bit cleaner, but under the threshold
 * - cleaner_later: a later start is meaningfully cleaner, so wait
 * - near_zero: the whole window is at or near zero carbon, so any time works
 * - flat: the whole window stays about the same, so any time works
 * - missing_data: half hours needed to judge "start now" are missing, so no answer
 */
export type NowOrWaitReason =
  | 'no_forecast'
  | 'now_is_best'
  | 'small_gain'
  | 'cleaner_later'
  | 'near_zero'
  | 'flat'
  | 'missing_data';

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
  /** Half hours missing inside the window we looked at (gaps, or a missing current half hour). */
  missingSlots: number;
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
    missingSlots: 0,
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
  // A live reading is real data for the current half hour: if the forecast row
  // for it is missing but the next one starts within half an hour, stand the
  // live value in for it (never a made-up value).
  if (live !== null && upcoming.length && upcoming[0].from > nowMs && upcoming[0].from - nowMs <= SLOT_MS) {
    upcoming.unshift({ from: upcoming[0].from - SLOT_MS, to: upcoming[0].from, value: live });
  }

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

  // Missing half hours inside the window we're judging (never treated as 0).
  const considered = upcoming.filter((s) => s.from < horizonEnd);
  const nowSlotStart = Math.floor(nowMs / SLOT_MS) * SLOT_MS;
  let missingSlots = 0;
  if (considered.length && considered[0].from > nowSlotStart) {
    missingSlots += Math.round((considered[0].from - nowSlotStart) / SLOT_MS);
  }
  for (let i = 1; i < considered.length; i++) {
    const gap = considered[i].from - considered[i - 1].to;
    if (gap > 0) missingSlots += Math.round(gap / SLOT_MS);
  }

  // "Start now" option. It needs the current half hour and a complete load
  // window; otherwise we can't honestly say "now", so we say data is missing.
  const current = upcoming[0].from <= nowMs ? 0 : -1;
  const nowAvg = current === 0 ? windowAvg(upcoming, 0, len, live ?? undefined) : null;
  if (nowAvg === null) {
    return { ...emptyPlan(live), reason: 'missing_data', coveredHours, partial, missingSlots: Math.max(1, missingSlots) };
  }

  // Cleanest later start (earliest wins ties).
  let best: { i: number; avg: number } | null = null;
  for (let i = current === 0 ? 1 : 0; i < upcoming.length; i++) {
    if (upcoming[i].from >= horizonEnd) break;
    const avg = windowAvg(upcoming, i, len);
    if (avg === null) continue;
    if (!best || avg < best.avg) best = { i, avg };
  }

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
    missingSlots,
  };

  // Whole window at/near zero or flat: any start time is as good as another,
  // so say that instead of implying "now" beats later.
  const windowValues = considered.map((s, i) => (i === 0 && current === 0 && live !== null ? live : s.value));
  const spread = classifySpread(windowValues);
  const anyTime: LoadPlan | null =
    spread === 'near_zero' || spread === 'flat' ? { ...base, reason: spread } : null;

  if (!best) {
    // Nothing after the current half hour to compare with: that's a partial
    // forecast, not proof that now is best.
    const laterSlots = upcoming.length - (current === 0 ? 1 : 0);
    return laterSlots === 0 ? emptyPlan(roundedNow) : (anyTime ?? base);
  }

  const bestWindow: LoadWindow = {
    start: new Date(upcoming[best.i].from),
    end: new Date(upcoming[best.i + len - 1].to),
    avg: Math.round(best.avg),
  };
  const grams = roundedNow - bestWindow.avg;

  if (grams <= 0) return { ...(anyTime ?? base), best: bestWindow };

  const percent = roundedNow > 0 ? (grams / roundedNow) * 100 : 0;
  const worthWaiting = percent >= MIN_PERCENT_CLEANER && grams >= MIN_GRAMS_CLEANER;

  if (!worthWaiting) {
    if (anyTime) return { ...anyTime, best: bestWindow };
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

/** Shared "any time works" detail line for near-zero or flat windows (home card and Planner). */
export function describeAnyTime(plan: Pick<LoadPlan, 'reason' | 'coveredHours' | 'nowAvg'>): string {
  const span = describeSpan(plan.coveredHours);
  const around = plan.nowAvg !== null ? `, around ${plan.nowAvg} ${UNIT}` : '';
  return plan.reason === 'near_zero'
    ? `The grid here is at or near zero carbon for ${span}${around}, so there's no cleaner time to wait for.`
    : `It stays about the same for ${span}${around}, so there's no cleaner time to wait for.`;
}

export const MISSING_SLOTS_NOTE = 'Some half hours are missing from the forecast, so this is based on the hours we have.';
export const MISSING_DATA_TITLE = 'Some of the forecast is missing';
export const MISSING_DATA_DETAIL =
  "Half hours are missing from the forecast, so we can't compare starting now with later yet.";

/** True when the plan says any start time is as good as another. */
export function isAnyTimePlan(plan: Pick<LoadPlan, 'reason'>): boolean {
  return plan.reason === 'near_zero' || plan.reason === 'flat';
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

  const tip = plan.missingSlots > 0 ? MISSING_SLOTS_NOTE : basis;

  switch (plan.reason) {
    case 'missing_data':
      return {
        ...common,
        headline: 'Forecast has gaps',
        detail: MISSING_DATA_DETAIL,
        tip: 'Pull down to refresh, or check back in a few minutes.',
      };

    case 'near_zero':
    case 'flat':
      return {
        ...common,
        headline: 'Any time works',
        detail: describeAnyTime(plan),
        tip,
      };

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
        countdownTarget: best.start,
        tip,
      };
    }

    case 'small_gain':
      return {
        ...common,
        headline: "Now's good",
        detail: `It won't get much cleaner in ${describeSpan(plan.coveredHours)}. Starting now averages around ${plan.nowAvg} ${UNIT}, and the best later start is around ${plan.best!.avg}.`,
        tip,
      };

    case 'now_is_best':
    default:
      return {
        ...common,
        headline: "Now's good",
        detail: `It won't get any cleaner in ${describeSpan(plan.coveredHours)}. Starting now averages around ${plan.nowAvg} ${UNIT}.`,
        tip,
      };
  }
}

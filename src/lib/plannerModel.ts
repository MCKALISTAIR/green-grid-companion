/**
 * Power Planner (spec v1.0 §6): result copy, grams saved, appliance store.
 * The decision itself is planLoad's, so the Planner, the home card and the
 * chart can't disagree.
 */
import {
  MISSING_DATA_DETAIL,
  MISSING_DATA_TITLE,
  describeAnyTime,
  describeWait,
  roundPercent,
  type LoadPlan,
  type LoadWindow,
} from '@/lib/nowOrWait';
import { formatLondonTime, londonDateKey } from '@/lib/londonTime';
import { normaliseTone, type CommentaryTone } from '@/lib/tone';

export const PLANNER_HORIZON_HOURS = 24;
const UNIT = 'gCO\u2082/kWh';

export interface PlannerResult {
  headline: string;
  tail: string | null;
  body: string;
  /** Caption when a deadline changed the answer. */
  deadlineHint: string | null;
  /** Window to shade on the chart (same object as the answer). */
  window: LoadWindow | null;
  /** Chart chip: `4h · 23:00–03:00` or `Now · 2h`. */
  chip: string | null;
  isNow: boolean;
}

export function formatHours(h: number): string {
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1).replace(/\.0$/, '')}h`;
}

function tomorrowSuffix(d: Date, now: Date): string {
  return londonDateKey(d) !== londonDateKey(now) ? ' tomorrow' : '';
}

export function plannerResult(
  plan: LoadPlan,
  { hours, now, deadlineMs, tone }: { hours: number; now: Date; deadlineMs: number | null; tone: CommentaryTone | string },
): PlannerResult {
  const cheeky = normaliseTone(tone) === 'cheeky';
  const t = (s: string) => (cheeky ? s : null);
  const doneNow = new Date(now.getTime() + hours * 3600_000);
  const deadline = deadlineMs != null ? new Date(deadlineMs) : null;
  const base = { deadlineHint: null as string | null, window: null as LoadWindow | null, chip: null as string | null, isNow: false };

  switch (plan.reason) {
    case 'no_forecast':
      return { ...base, headline: 'Forecast not in yet', tail: null, body: "We can't pick a time until the forecast loads. Pull down to try again." };
    case 'missing_data':
      return { ...base, headline: MISSING_DATA_TITLE, tail: null, body: MISSING_DATA_DETAIL };
    case 'too_tight':
      return {
        ...base,
        headline: "That's cutting it fine",
        tail: null,
        body: `A ${formatHours(hours).replace('h', '-hour')} run can't finish by ${deadline ? formatLondonTime(deadline) : 'then'} if it starts now. Start now and it ends at ${formatLondonTime(doneNow)}, or move the deadline.`,
      };
    case 'near_zero':
    case 'flat': {
      const allZero = plan.nowAvg === 0;
      return {
        ...base,
        headline: 'Any time works',
        tail: t(plan.reason === 'near_zero' && allZero ? "It's already zero carbon." : 'About as clean as it gets.'),
        body: describeAnyTime(plan),
      };
    }
    case 'cleaner_later': {
      const w = plan.best as LoadWindow;
      const startSfx = tomorrowSuffix(w.start, now);
      const endSfx = startSfx ? '' : tomorrowSuffix(w.end, now);
      return {
        ...base,
        headline: `Start at ${formatLondonTime(w.start)}${startSfx}, done by ${formatLondonTime(w.end)}${endSfx}`,
        tail: t('Worth the wait.'),
        body: `That's ${describeWait(plan.waitMinutes)} away.`,
        window: w,
        chip: `${formatHours(hours)} \u00b7 ${formatLondonTime(w.start)}\u2013${formatLondonTime(w.end)}`,
        deadlineHint: deadlineHint(plan),
      };
    }
    case 'small_gain':
    case 'now_is_best': {
      const scope = deadline ? `before ${formatLondonTime(deadline)}` : 'in the next 24 hours';
      const body =
        plan.reason === 'small_gain' && plan.best
          ? `It won't get much cleaner ${deadline ? 'before your deadline' : 'in the next 24 hours'}. The best later start (${formatLondonTime(plan.best.start)}) is only ${plan.gramsCleaner} g cleaner.`
          : `It won't get any cleaner ${scope}.`;
      return {
        ...base,
        headline: `Start now, done by ${formatLondonTime(doneNow)}`,
        tail: t(plan.reason === 'small_gain' ? 'Close enough. Crack on.' : 'As good as it gets. Off you go.'),
        body,
        window: plan.nowWindow,
        chip: `Now \u00b7 ${formatHours(hours)}`,
        isNow: true,
        deadlineHint: deadlineHint(plan),
      };
    }
  }
}

/** `Without the deadline, 02:00 would be around 18% cleaner.` when the deadline changed the answer. */
export function deadlineHint(plan: LoadPlan): string | null {
  const free = plan.bestWithoutDeadline;
  if (!free || plan.nowAvg == null || plan.nowAvg <= 0) return null;
  const chosen = plan.reason === 'cleaner_later' ? plan.best : plan.nowWindow;
  if (!chosen || free.start.getTime() === chosen.start.getTime() || free.avg >= chosen.avg) return null;
  const pct = roundPercent(((chosen.avg - free.avg) / chosen.avg) * 100);
  if (pct <= 0) return null;
  return `Without the deadline, ${formatLondonTime(free.start)} would be around ${pct}% cleaner.`;
}

/** Grams saved, rounded: < 1000 g to nearest 10 g, else 0.1 kg. null without kWh. */
export function gramsSaved(plan: LoadPlan, kwh: number | null): { grams: number; text: string } | null {
  if (kwh == null || !(kwh > 0) || plan.reason !== 'cleaner_later' || !plan.best || plan.nowAvg == null) return null;
  const g = (plan.nowAvg - plan.best.avg) * kwh;
  if (!(g > 0)) return null;
  return { grams: g, text: formatGrams(g) };
}

export function formatGrams(g: number): string {
  if (g < 1000) return `about ${Math.round(g / 10) * 10} g`;
  return `about ${(Math.round(g / 100) / 10).toFixed(1)} kg`;
}

export function statsCaption(plan: LoadPlan, kwh: number | null): string | null {
  if (plan.reason !== 'cleaner_later' || !plan.best || plan.nowAvg == null) return null;
  const w = plan.best;
  let s = `Starting now averages ${plan.nowAvg} ${UNIT}; ${formatLondonTime(w.start)}\u2013${formatLondonTime(w.end)} averages ${w.avg}.`;
  if (kwh != null && kwh > 0) s += ` Saved: ${plan.nowAvg - w.avg} g/kWh \u00d7 about ${formatKwh(kwh)} kWh, rounded.`;
  return s;
}

export function formatKwh(k: number): string {
  return k >= 10 ? String(Math.round(k)) : String(Math.round(k * 10) / 10);
}

// ---------- Appliances ----------

export interface Appliance {
  id: string;
  name: string;
  hours: number;
  kwh: number | null;
  pinned: boolean;
  lastUsed: number | null;
  /** Built-in (EV, Washing, Dishwasher, Dryer). */
  builtin?: boolean;
}

export const EV_KW = 7.4;
export const APPLIANCES_KEY = 'gridsense-planner-appliances';

export const DEFAULT_APPLIANCES: Appliance[] = [
  { id: 'ev', name: 'EV charge', hours: 4, kwh: null, pinned: false, lastUsed: null, builtin: true },
  { id: 'washing', name: 'Washing', hours: 2, kwh: null, pinned: false, lastUsed: null, builtin: true },
  { id: 'dish', name: 'Dishwasher', hours: 2, kwh: null, pinned: false, lastUsed: null, builtin: true },
  { id: 'dryer', name: 'Dryer', hours: 1, kwh: null, pinned: false, lastUsed: null, builtin: true },
];

/** EV default: 7.4 kW × run length, whole kWh. Others: none (ask). */
export function defaultKwh(a: Pick<Appliance, 'id' | 'hours'>): number | null {
  return a.id === 'ev' ? Math.round(EV_KW * a.hours) : null;
}

export function clampHours(h: number): number {
  return Math.min(12, Math.max(0.5, Math.round(h * 2) / 2));
}

interface LegacyCustom {
  name?: string;
  duration?: number | string;
}

/** Read the store, migrating the old single custom appliance (settings.customAppliance / planner-custom-event). */
export function loadAppliances(storage: Pick<Storage, 'getItem'>, legacy?: LegacyCustom | null): Appliance[] {
  let saved: Appliance[] = [];
  try {
    const raw = storage.getItem(APPLIANCES_KEY);
    if (raw) saved = (JSON.parse(raw) as Appliance[]).filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string');
  } catch {
    saved = [];
  }
  const byId = new Map(saved.map((a) => [a.id, a]));
  const out: Appliance[] = DEFAULT_APPLIANCES.map((d) => ({ ...d, ...(byId.get(d.id) ?? {}), builtin: true }));
  for (const a of saved) if (!DEFAULT_APPLIANCES.some((d) => d.id === a.id)) out.push({ ...a, hours: clampHours(Number(a.hours) || 1), builtin: false });
  if (!saved.length && legacy?.name) {
    out.push({ id: 'custom-legacy', name: String(legacy.name).slice(0, 24), hours: clampHours(Number(legacy.duration) || 1), kwh: null, pinned: false, lastUsed: null });
  }
  return out;
}

export function saveAppliances(storage: Pick<Storage, 'setItem'>, list: Appliance[]): void {
  try {
    storage.setItem(APPLIANCES_KEY, JSON.stringify(list.map(({ builtin: _b, ...a }) => a)));
  } catch {
    /* ignore */
  }
}

/** Chip order: selected, pinned, recent (by lastUsed), defaults, then customs never used. */
export function orderChips(list: Appliance[], selectedId: string | null): Appliance[] {
  const rank = (a: Appliance) => (a.id === selectedId ? 0 : a.pinned ? 1 : a.lastUsed ? 2 : a.builtin ? 3 : 4);
  return [...list].sort((a, b) => rank(a) - rank(b) || (b.lastUsed ?? 0) - (a.lastUsed ?? 0) || list.indexOf(a) - list.indexOf(b));
}

// ---------- Reminder ----------

export function reminderAt(plan: LoadPlan, now: Date): Date | null {
  if (plan.reason !== 'cleaner_later' || !plan.best) return null;
  if (plan.best.start.getTime() - now.getTime() < 20 * 60_000) return null;
  return new Date(plan.best.start.getTime() - 15 * 60_000);
}

export function reminderCopy(appliance: string, w: LoadWindow, tone: CommentaryTone | string): { title: string; body: string } {
  const title = `Clean window from ${formatLondonTime(w.start)}`;
  const body =
    normaliseTone(tone) === 'cheeky'
      ? `Time to start the ${appliance.toLowerCase()}. ${w.avg} ${UNIT} forecast.`
      : `Start the ${appliance.toLowerCase()} now for the cleanest run. ${w.avg} ${UNIT} forecast.`;
  return { title, body };
}

/** Phase 2 (spec §6.2): Octopus cost needs a tariff unit-rate fetch the app doesn't have yet. */
export const PLANNER_OCTOPUS_COST = false;

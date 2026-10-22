// Which daily-forecast subscriptions are due on this run (BH-69, BH-70).
//
// The cron runs every 15 minutes. A subscription is due on the first run at or
// after its chosen Europe/London wall time, so any minute works (07:15, HH:59).
// Each due subscription carries the London date its slot belongs to; the
// caller claims (daily-forecast, slotDate, id) so it sends at most once a day.
//
// - Non-hour times and HH:59: due on the next quarter-hour run.
// - Spring forward (28 Mar 2027): 01:00–01:59 never happens on the wall clock.
//   The 02:00 BST run is the first run after it, so those users get it then.
// - Fall back (25 Oct 2026): 01:00–01:59 happens twice. The first pass sends,
//   and the per-day claim stops the repeat.
// - A slot later than the last run of the day (e.g. 23:59) is sent on the
//   00:00 run and claimed against the previous London date.
//
// A catch-up limit stops a user who saves 07:00 at 15:00 from getting a stale
// "today's outlook" mid-afternoon.

/** Max wall-clock minutes after the chosen time that a run may still send. */
export const CATCH_UP_MINUTES = 90;

const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** London wall clock for an instant: date key and minutes since midnight. */
export function londonWallClock(now: Date): { date: string; minutes: number } {
  const p = Object.fromEntries(parts.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

function previousDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** "HH:MM" or "HH:MM:SS" to minutes since midnight, or null if malformed. */
export function parseChosenTime(value: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export interface DueSubscription<T> {
  sub: T;
  /** London date (YYYY-MM-DD) the chosen slot belongs to; use as the claim period. */
  periodKey: string;
}

/**
 * Subscriptions due on a run at `now`. Pass every enabled subscription; the
 * selection is done here so it can be tested without a database.
 */
export function selectDueSubscriptions<T extends { daily_forecast_time: string }>(
  subs: T[],
  now: Date,
  catchUpMinutes = CATCH_UP_MINUTES,
): DueSubscription<T>[] {
  const wall = londonWallClock(now);
  const due: DueSubscription<T>[] = [];
  for (const sub of subs) {
    const chosen = parseChosenTime(sub.daily_forecast_time);
    if (chosen === null) continue;
    let lag = wall.minutes - chosen;
    let periodKey = wall.date;
    if (lag < 0) {
      // Slot was late yesterday (e.g. 23:59) and this is the first run after it.
      lag += 24 * 60;
      periodKey = previousDate(wall.date);
    }
    if (lag <= catchUpMinutes) due.push({ sub, periodKey });
  }
  return due;
}

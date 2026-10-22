// Europe/London calendar helpers for the monthly report (BH-71). The Deno
// runtime is UTC, so `new Date(y, m, 1)` is UTC midnight: in BST months that
// is 01:00 London, and 00:00–01:00 on the 1st landed in the previous month.

const HOUR_MS = 60 * 60 * 1000;

const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** London wall-clock fields for an instant (month is 0-based). */
export function londonParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const p = Object.fromEntries(parts.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month) - 1,
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
  };
}

/** Instant of 00:00 Europe/London on y-m-d (month 0-based, overflow allowed). */
export function londonMidnight(year: number, month: number, day: number): Date {
  const utc = Date.UTC(year, month, day);
  const target = new Date(utc);
  for (const candidate of [utc, utc - HOUR_MS]) {
    const p = londonParts(new Date(candidate));
    if (
      p.hour === 0 &&
      p.minute === 0 &&
      p.day === target.getUTCDate() &&
      p.month === target.getUTCMonth()
    ) {
      return new Date(candidate);
    }
  }
  return target;
}

/** [start, end) of a London calendar month: London midnight on the 1st to London midnight on the next 1st. */
export function londonMonthBounds(
  year: number,
  month: number,
): { start: Date; endExclusive: Date } {
  return {
    start: londonMidnight(year, month, 1),
    endExclusive: londonMidnight(year, month + 1, 1),
  };
}

/** The London month before the one `now` falls in (month 0-based). */
export function previousLondonMonth(now: Date): { year: number; month: number } {
  const { year, month } = londonParts(now);
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

/** Week of month (1-based, weeks start Sunday) by London date. */
export function londonWeekOfMonth(date: Date): number {
  const { year, month, day } = londonParts(date);
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return Math.ceil((day + firstWeekday) / 7);
}

/** London hour of day (0–23). */
export function londonHour(date: Date): number {
  return londonParts(date).hour;
}

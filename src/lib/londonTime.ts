/**
 * Time helpers pinned to Europe/London.
 *
 * Carbon intensity data is for Great Britain, so planning copy always shows
 * UK clock time, whatever timezone the device happens to be in.
 */
export const LONDON_TZ = 'Europe/London';

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LONDON_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TZ,
  weekday: 'long',
});

/** "14:30" in UK time. */
export function formatLondonTime(date: Date): string {
  return timeFormatter.format(date);
}

/** "2026-10-10" for the UK calendar day the instant falls on. */
export function londonDateKey(date: Date): string {
  return dateKeyFormatter.format(date);
}

/**
 * Day label relative to `now`, in UK time: '' for today, 'tomorrow',
 * otherwise the weekday name ("Monday").
 */
export function londonDayLabel(date: Date, now: Date = new Date()): string {
  const key = londonDateKey(date);
  if (key === londonDateKey(now)) return '';
  // Noon-to-noon step avoids DST edge cases when finding "tomorrow".
  const [y, m, d] = londonDateKey(now).split('-').map(Number);
  const tomorrowNoonUtc = new Date(Date.UTC(y, m - 1, d + 1, 12));
  if (key === londonDateKey(tomorrowNoonUtc)) return 'tomorrow';
  return weekdayFormatter.format(date);
}

/** "14:30", "14:30 tomorrow" or "14:30 Monday". */
export function formatLondonTimeWithDay(date: Date, now: Date = new Date()): string {
  const day = londonDayLabel(date, now);
  return day ? `${formatLondonTime(date)} ${day}` : formatLondonTime(date);
}

const shortDayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TZ,
  weekday: 'short',
  day: 'numeric',
});

const shortWeekdayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TZ,
  weekday: 'short',
});

/** "Sat 24" in UK time. */
export function formatLondonShortDay(date: Date): string {
  return shortDayFormatter.format(date).replace(',', '');
}

/** "Sat" in UK time. */
export function formatLondonShortWeekday(date: Date): string {
  return shortWeekdayFormatter.format(date);
}

/** Long weekday ("Saturday") in UK time. */
export function formatLondonWeekday(date: Date): string {
  return weekdayFormatter.format(date);
}

const longDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'short',
});

/** "Saturday, 24 Oct" in UK time. */
export function formatLondonLongDate(date: Date): string {
  const parts = longDateFormatter.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('weekday')}, ${get('day')} ${get('month')}`;
}

// --- BH-68 / BH-72: London day bounds and clock-change-aware slot labels ---

const HOUR_MS = 60 * 60 * 1000;

/** "2026-10-25" for the calendar day the user tapped in a device-local date picker. */
export function pickedDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The instant of 00:00 Europe/London on `dateKey` (YYYY-MM-DD). UK midnight is never skipped or repeated. */
export function londonMidnight(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  // UK is UTC+0 or UTC+1, so London midnight is UTC midnight or one hour before.
  for (const candidate of [utcMidnight, utcMidnight - HOUR_MS]) {
    const at = new Date(candidate);
    if (londonDateKey(at) === dateKey && formatLondonTime(at) === '00:00') return at;
  }
  return new Date(utcMidnight);
}

/** Next calendar day key, stepping noon to noon so clock changes can't skip a day. */
export function nextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, 12)).toISOString().slice(0, 10);
}

/** Start (London midnight) and inclusive end (1 ms before the next London midnight) of a UK day. */
export function londonDayBounds(dateKey: string): { from: Date; to: Date } {
  const from = londonMidnight(dateKey);
  const to = new Date(londonMidnight(nextDateKey(dateKey)).getTime() - 1);
  return { from, to };
}

/**
 * True for instants in the second pass of a repeated hour (01:00–01:59 GMT on
 * the last Sunday of October): the same wall time already happened an hour ago.
 */
export function isRepeatedLondonTime(date: Date): boolean {
  return formatLondonTime(date) === formatLondonTime(new Date(date.getTime() - HOUR_MS));
}

/**
 * Zone tag for a wall time that happens twice on the October clock-change day:
 * 'BST' on the first pass, 'GMT' on the second, null otherwise (including the
 * spring missing hour, which never appears).
 */
export function londonRepeatedZone(date: Date): 'BST' | 'GMT' | null {
  if (isRepeatedLondonTime(date)) return 'GMT';
  const time = formatLondonTime(date);
  return time === formatLondonTime(new Date(date.getTime() + HOUR_MS)) ? 'BST' : null;
}

/** "14:30", or "01:30 BST" / "01:30 GMT" for the repeated hour on clock-change day. */
export function formatLondonSlotTime(date: Date): string {
  const time = formatLondonTime(date);
  const zone = londonRepeatedZone(date);
  return zone ? `${time} ${zone}` : time;
}

/**
 * Screen-reader time: "14:30", or for the repeated hour
 * "1 am BST, before the clocks went back" / "1:30 am GMT, after the clocks went back".
 */
export function formatLondonSlotSpoken(date: Date): string {
  const time = formatLondonTime(date);
  const zone = londonRepeatedZone(date);
  if (!zone) return time;
  const [h, m] = time.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const clock = m === 0 ? `${h12}` : `${h12}:${String(m).padStart(2, '0')}`;
  const when = zone === 'BST' ? 'before' : 'after';
  return `${clock} ${h < 12 ? 'am' : 'pm'} ${zone}, ${when} the clocks went back`;
}

const dayMonthFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TZ,
  day: '2-digit',
  month: 'short',
});

/** "05 Oct" in UK time. */
export function formatLondonDayMonth(date: Date): string {
  return dayMonthFormatter.format(date);
}

const mediumDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TZ,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "25 Oct 2026, 01:30 GMT" in UK time (GMT suffix only on the repeated hour). */
export function formatLondonDateTime(date: Date): string {
  return `${mediumDateFormatter.format(date)}, ${formatLondonSlotTime(date)}`;
}

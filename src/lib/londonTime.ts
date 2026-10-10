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

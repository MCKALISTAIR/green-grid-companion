// Per-slot Europe/London formatting (BH-33). Each slot gets its own offset, so a
// run on the Saturday before a clock change formats Sunday's slots correctly.
const hm = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const ymd = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "HH:MM" in UK local time for this instant. */
export function formatUKTime(iso: string | Date): string {
  return hm.format(new Date(iso)).replace(/^24:/, '00:');
}

/** "YYYY-MM-DD" UK local date for this instant. */
export function ukDateKey(iso: string | Date): string {
  return ymd.format(new Date(iso));
}

/** True when the slot falls on a later UK calendar day than `now`. */
export function isTomorrowUK(iso: string | Date, now: Date): boolean {
  return ukDateKey(iso) !== ukDateKey(now);
}

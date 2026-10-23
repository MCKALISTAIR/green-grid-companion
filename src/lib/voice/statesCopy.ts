/**
 * Offline pill, off-grid and postcode notices, and the stale-reading rule.
 * Plain in both tones (clarity wins). Times are Europe/London. Error-state
 * cards (slow, outage, stale, offline, rank, planner) live in errorStatesCopy.
 */
import {
  formatLondonDayLongMonth,
  formatLondonDayShortMonth,
  formatLondonShortWeekday,
  formatLondonSlotSpoken,
  formatLondonSlotTime,
  formatLondonWeekday,
  londonDateKey,
} from '@/lib/londonTime';

/**
 * Offline pill (motion spec §2.7). Says how old the figure is, so it uses the
 * reading's own time (BH-88), in UK time. Day labels are Design's call (#178):
 * today is the time only, then "yesterday 07:00", "Tue 07:00" for 2 to 6 days
 * ago, and the date ("12 Oct") for anything older. The repeated hour on
 * clock-change night keeps its BST/GMT tag.
 */
export const OFFLINE_PILL_COPY = {
  prefix: 'Offline · figures from',
  nothingSaved: 'Offline · nothing saved yet',
  /** Lower case mid-line; `readingWhen(…, { atStart: true })` capitalises it. */
  yesterday: 'yesterday',
  /** Screen-reader form, e.g. "Offline. Reading from yesterday at 07:00" (Design call, #178). */
  ariaOffline: 'Offline.',
  ariaPrefix: 'Reading from',
  ariaYesterday: 'yesterday',
  ariaAt: 'at',
  ariaNothingSaved: 'Offline. Nothing saved yet.',
} as const;

export type ReadingDayBand = 'today' | 'yesterday' | 'weekday' | 'date';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole UK calendar days between the reading and now (0 = same UK day). */
export function londonDaysAgo(readingAt: number, now: number): number {
  const day = (t: number) => {
    const [y, m, d] = londonDateKey(new Date(t)).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((day(now) - day(readingAt)) / DAY_MS);
}

export function readingDayBand(readingAt: number, now: number): ReadingDayBand {
  const days = londonDaysAgo(readingAt, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days <= 6) return 'weekday';
  return 'date';
}

/** Upper-cases the first letter, for copy that starts a line. */
export function capitaliseFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * "07:00", "yesterday 07:00", "Tue 07:00" or "12 Oct", in UK time. Lower case
 * mid-line (Design call, #178); pass `atStart` when it starts the text
 * ("Yesterday 07:00").
 */
export function readingWhen(
  readingAt: number,
  now: number,
  { atStart = false }: { atStart?: boolean } = {},
): string {
  const text = readingWhenMidLine(readingAt, now);
  return atStart ? capitaliseFirst(text) : text;
}

function readingWhenMidLine(readingAt: number, now: number): string {
  const at = new Date(readingAt);
  const time = formatLondonSlotTime(at);
  switch (readingDayBand(readingAt, now)) {
    case 'today':
      return time;
    case 'yesterday':
      return `${OFFLINE_PILL_COPY.yesterday} ${time}`;
    case 'weekday':
      return `${formatLondonShortWeekday(at)} ${time}`;
    case 'date':
      return formatLondonDayShortMonth(at);
  }
}

/** "07:00", "yesterday at 07:00", "Tuesday at 07:00" or "12 October", for screen readers. */
export function readingWhenSpoken(readingAt: number, now: number): string {
  const at = new Date(readingAt);
  const time = formatLondonSlotSpoken(at);
  const { ariaAt } = OFFLINE_PILL_COPY;
  switch (readingDayBand(readingAt, now)) {
    case 'today':
      return time;
    case 'yesterday':
      return `${OFFLINE_PILL_COPY.ariaYesterday} ${ariaAt} ${time}`;
    case 'weekday':
      return `${formatLondonWeekday(at)} ${ariaAt} ${time}`;
    case 'date':
      return formatLondonDayLongMonth(at);
  }
}

export function offlinePillText(readingAt: number | null, now: number = Date.now()): string {
  if (!readingAt) return OFFLINE_PILL_COPY.nothingSaved;
  return `${OFFLINE_PILL_COPY.prefix} ${readingWhen(readingAt, now)}`;
}

/** e.g. "Offline. Reading from yesterday at 07:00". */
export function offlinePillLabel(readingAt: number | null, now: number = Date.now()): string {
  if (!readingAt) return OFFLINE_PILL_COPY.ariaNothingSaved;
  return `${OFFLINE_PILL_COPY.ariaOffline} ${OFFLINE_PILL_COPY.ariaPrefix} ${readingWhenSpoken(readingAt, now)}`;
}

export const BACK_ONLINE_PILL = 'Back online';

/** Query keys (first element) that hold carbon intensity figures. */
export const CARBON_QUERY_ROOTS = new Set(['national', 'regional', 'forecast']);

/** Home notice when the saved postcode is not on the GB grid (figures are the GB average). */
export const OFF_GRID_HOME_COPY = {
  northernIreland: 'Northern Ireland is on the all-island grid',
  channelIslands: "The Channel Islands aren't on the GB grid",
  isleOfMan: 'The Isle of Man has its own grid',
  bfpo: "We can't place a Forces (BFPO) address",
  body: "NESO's data only covers Great Britain, so this is the GB average.",
  bodyCheeky: "NESO's data stops at Great Britain, so you're seeing the GB average.",
  action: 'Change location',
} as const;

/** Reading periods are 30 min; older than this means refreshes are failing. */
export const STALE_READING_MS = 60 * 60 * 1000;

export function isReadingStale(fromIso: string | undefined, nowMs: number = Date.now()): boolean {
  if (!fromIso) return false;
  const from = Date.parse(fromIso);
  return Number.isFinite(from) && nowMs - from > STALE_READING_MS;
}
/**
 * Home notice when the saved postcode doesn't exist (#108; Design call 22 Oct).
 * Same wording in Cheeky and Plain. The action opens the location picker.
 */
export const POSTCODE_NOT_FOUND_COPY = {
  title: (postcode: string) => `We couldn't find ${postcode}`,
  body: 'Showing the GB average for now.',
  action: 'Fix postcode',
} as const;

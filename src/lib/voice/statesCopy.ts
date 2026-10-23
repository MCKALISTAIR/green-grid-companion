/**
 * Offline pill, off-grid and postcode notices, and the stale-reading rule.
 * Plain in both tones (clarity wins). Times are Europe/London. Error-state
 * cards (slow, outage, stale, offline, rank, planner) live in errorStatesCopy.
 */
import { formatLondonTime } from '@/lib/londonTime';

/** Compact hero pill (motion spec §2.7). `savedAt` is when the newest cached carbon figures were fetched (ms), or null. */
export function offlinePillText(savedAt: number | null): string {
  if (!savedAt) return 'Offline · nothing saved yet';
  return `Offline · figures from ${formatLondonTime(new Date(savedAt))}`;
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

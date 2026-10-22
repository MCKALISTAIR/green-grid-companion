/**
 * Loading, offline and empty-state copy. Plain in both tones (clarity wins).
 * Times are Europe/London.
 */
import { formatLondonTime } from '@/lib/londonTime';

/** Offline banner text. `savedAt` is when the newest cached carbon figures were fetched (ms), or null. */
export function offlineBannerText(savedAt: number | null): string {
  if (!savedAt) return "You're offline. Nothing saved yet.";
  return `You're offline. Figures from ${formatLondonTime(new Date(savedAt))}.`;
}

export const BACK_ONLINE_TEXT = "You're back online.";

/** Query keys (first element) that hold carbon intensity figures. */
export const CARBON_QUERY_ROOTS = new Set(['national', 'regional', 'forecast']);

/** Home notice when the newest reading is over an hour old (refreshes are failing). */
export function staleReadingCopy(readingFrom: Date): {
  title: string;
  body: string;
  retry: string;
} {
  return {
    title: `Last known reading from ${formatLondonTime(readingFrom)}`,
    body: "We couldn't get a newer one from NESO. These figures may be out of date.",
    retry: 'Try again',
  };
}

/** Reading periods are 30 min; older than this means refreshes are failing. */
export const STALE_READING_MS = 60 * 60 * 1000;

export function isReadingStale(fromIso: string | undefined, nowMs: number = Date.now()): boolean {
  if (!fromIso) return false;
  const from = Date.parse(fromIso);
  return Number.isFinite(from) && nowMs - from > STALE_READING_MS;
}
/** Shown when a load has taken longer than ~8s (the request gives up at 10s). */
export const SLOW_LOADING_COPY = {
  title: 'Still waiting for NESO…',
  body: 'The grid data service is slow right now.',
  retry: 'Try again',
} as const;

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

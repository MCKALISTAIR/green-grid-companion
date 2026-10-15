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

/** Shown when a load has taken longer than ~8s (the request gives up at 10s). */
export const SLOW_LOADING_COPY = {
  title: 'Still waiting for NESO…',
  body: 'The grid data service is slow right now.',
  retry: 'Try again',
} as const;

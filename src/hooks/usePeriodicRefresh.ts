import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/** Don't force another stale-data refresh within this window of the last one. */
export const STALE_REFRESH_MIN_GAP_MS = 5 * 60 * 1000;

let lastForcedRefreshAt = 0;

/**
 * Record that carbon data was just force-refreshed (e.g. on app resume), so the
 * stale-data check below doesn't fire a second, identical batch straight after.
 */
export function markCarbonDataRefreshed(now: number = Date.now()) {
  lastForcedRefreshAt = now;
}

/** Test helper. */
export function resetPeriodicRefreshState() {
  lastForcedRefreshAt = 0;
}

export function shouldForceStaleRefresh(
  lastUpdated: string | null,
  now: number,
  lastForcedAt: number,
): boolean {
  if (!lastUpdated) return false;
  const nextExpected = new Date(lastUpdated).getTime() + 30 * 60 * 1000;
  // More than 2 minutes past the expected update…
  if (now <= nextExpected + 2 * 60 * 1000) return false;
  // …and we haven't already tried recently. NESO often publishes late; without
  // this gap we re-requested every endpoint every minute (and twice on resume).
  return now - lastForcedAt >= STALE_REFRESH_MIN_GAP_MS;
}

export function usePeriodicRefresh(lastUpdated: string | null, refetch: () => void) {
  // Periodic stale data check - ensures data refreshes even if intervals miss
  useEffect(() => {
    // Queries already fetch on mount (refetchOnMount), so the first forced
    // stale refresh waits one gap after the app opens.
    if (lastForcedRefreshAt === 0) lastForcedRefreshAt = Date.now();

    const checkAndRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (shouldForceStaleRefresh(lastUpdated, now, lastForcedRefreshAt)) {
        logger.info('Carbon data appears stale, triggering refresh');
        lastForcedRefreshAt = now;
        refetch();
      }
    };

    // Check every minute
    const intervalId = setInterval(checkAndRefresh, 60 * 1000);

    // Also check immediately on mount
    checkAndRefresh();

    return () => clearInterval(intervalId);
  }, [lastUpdated, refetch]);
}

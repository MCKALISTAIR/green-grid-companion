import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export function usePeriodicRefresh(lastUpdated: string | null, refetch: () => void) {
  // Periodic stale data check - ensures data refreshes even if intervals miss
  useEffect(() => {
    const checkAndRefresh = () => {
      if (lastUpdated) {
        const nextExpected = new Date(lastUpdated).getTime() + 30 * 60 * 1000;
        const now = Date.now();

        // If we're more than 2 minutes past expected update, force refresh
        if (now > nextExpected + 2 * 60 * 1000) {
          logger.info('Carbon data appears stale, triggering refresh');
          refetch();
        }
      }
    };

    // Check every minute
    const intervalId = setInterval(checkAndRefresh, 60 * 1000);

    // Also check immediately on mount
    checkAndRefresh();

    return () => clearInterval(intervalId);
  }, [lastUpdated, refetch]);
}

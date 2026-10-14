import { useEffect } from 'react';

/**
 * Warm the primary tab chunks after first paint so tab switches rarely
 * flash a Suspense fallback mid-transition.
 */
export function useRoutePrefetch() {
  useEffect(() => {
    const prefetch = () => {
      void import('@/pages/Planner');
      void import('@/pages/History');
      void import('@/pages/Map');
      void import('@/pages/Settings');
    };

    const ric =
      window.requestIdleCallback ??
      ((cb: IdleRequestCallback) =>
        window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 250));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = ric(prefetch, { timeout: 2000 });

    return () => cancel(id);
  }, []);
}

import { useRef, useCallback } from 'react';

/**
 * Wraps a refetch function with a global throttle to prevent rapid-fire API calls
 * (e.g. from pull-to-refresh spam). Ignores calls within the cooldown window.
 */
export function useThrottledRefetch(refetchFn: () => Promise<void>, cooldownMs = 10_000) {
  const lastCallRef = useRef(0);

  const throttledRefetch = useCallback(async () => {
    const now = Date.now();
    if (now - lastCallRef.current < cooldownMs) {
      return; // Still within cooldown — skip
    }
    lastCallRef.current = now;
    await refetchFn();
  }, [refetchFn, cooldownMs]);

  return throttledRefetch;
}

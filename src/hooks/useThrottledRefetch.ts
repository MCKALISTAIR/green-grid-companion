import { useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface ThrottledRefetchOptions {
  /** Cooldown window in milliseconds. Defaults to 10s. */
  cooldownMs?: number;
  /** Show a toast when a refresh is skipped due to throttling. Defaults to true. */
  notifyOnSkip?: boolean;
  /** Custom toast title shown when skipped. */
  skipToastTitle?: string;
  /** Custom toast description shown when skipped. */
  skipToastDescription?: string;
}

/**
 * Wraps a refetch function with a configurable throttle to prevent rapid-fire
 * API calls (e.g. from pull-to-refresh spam). Calls within the cooldown window
 * are skipped. Returns true if the refetch ran, false if it was throttled.
 */
export function useThrottledRefetch(
  refetchFn: () => Promise<unknown>,
  options: ThrottledRefetchOptions | number = {},
) {
  // Backwards-compat: allow passing a plain number for cooldownMs
  const opts: ThrottledRefetchOptions =
    typeof options === 'number' ? { cooldownMs: options } : options;

  const {
    cooldownMs = 10_000,
    notifyOnSkip = true,
    skipToastTitle = 'Hold on a moment',
    skipToastDescription,
  } = opts;

  const lastCallRef = useRef(0);

  const throttledRefetch = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    const elapsed = now - lastCallRef.current;

    if (elapsed < cooldownMs) {
      if (notifyOnSkip) {
        const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
        toast.info(skipToastTitle, {
          description: skipToastDescription ?? `You can refresh again in ${remaining}s.`,
        });
      }
      return false;
    }

    lastCallRef.current = now;
    await refetchFn();
    return true;
  }, [refetchFn, cooldownMs, notifyOnSkip, skipToastTitle, skipToastDescription]);

  return throttledRefetch;
}

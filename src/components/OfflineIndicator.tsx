import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOffline } from '@/hooks/useOffline';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NotificationType } from '@capacitor/haptics';
import { useOfflineEmptyStateShown } from '@/lib/offlineEmptyState';
import { useQueryClient } from '@tanstack/react-query';
import { BACK_ONLINE_PILL, CARBON_QUERY_ROOTS, offlinePillText } from '@/lib/voice/statesCopy';
import { useHeroStatusSlot } from '@/lib/heroStatusSlot';
import { dur, spring } from '@/lib/motion';

/** How long "Back online" stays before fading (motion spec §2.7). */
export const BACK_ONLINE_MS = 1600;

/** One Warning haptic per app session, not per drop. */
let warnedThisSession = false;
export function resetOfflineWarningForTests() {
  warnedThisSession = false;
}

/**
 * Offline / back-online status as a compact pill (motion spec §2.7).
 * On Home it sits inside the hero under the location chip (portal into the
 * hero's status slot) so it never covers the reading; on other screens it
 * floats as the same pill just below the status bar. Reconnect morphs the
 * pill to "Back online" and fades it after 1.6s. React Query refetches on
 * reconnect by itself, so there's no Refresh button any more.
 */
export function OfflineIndicator() {
  const { isOffline, wasOffline, clearWasOffline } = useOffline();
  const [showReconnected, setShowReconnected] = useState(false);
  const { notification } = useHaptics();
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const slot = useHeroStatusSlot();
  // Home's full offline state (nothing cached) already says it; no pill too.
  const emptyStateShown = useOfflineEmptyStateShown();

  const savedAt = isOffline
    ? Math.max(
        0,
        ...queryClient
          .getQueryCache()
          .getAll()
          .filter(
            (q) => CARBON_QUERY_ROOTS.has(String(q.queryKey[0])) && q.state.data !== undefined,
          )
          .map((q) => q.state.dataUpdatedAt),
      ) || null
    : null;

  useEffect(() => {
    if (isOffline && !warnedThisSession) {
      warnedThisSession = true;
      notification(NotificationType.Warning);
    }
  }, [isOffline, notification]);

  useEffect(() => {
    if (!wasOffline) return;
    // Refetch in place (never a page reload). React Query's refetchOnReconnect
    // skips queries still inside staleTime, so ask explicitly.
    void queryClient.refetchQueries({ type: 'active' });
    setShowReconnected(true);
    const timer = setTimeout(() => {
      setShowReconnected(false);
      clearWasOffline();
    }, BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [wasOffline, clearWasOffline, queryClient]);

  const state: 'offline' | 'online' | null = isOffline
    ? emptyStateShown
      ? null
      : 'offline'
    : showReconnected
      ? 'online'
      : null;

  const pill = (
    <AnimatePresence>
      {state && (
        <motion.div
          key="connection-pill"
          layout={!reduced}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: dur.fast } }}
          transition={reduced ? { duration: dur.reduced } : spring.snappy}
          className="inline-flex items-center gap-2 rounded-full bg-background/95 text-foreground border border-border/60 shadow-sm px-3 py-1.5 text-xs font-semibold backdrop-blur"
          role="status"
          aria-live="polite"
          data-testid="connection-pill"
          data-state={state}
        >
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${state === 'offline' ? 'bg-amber-500' : 'bg-emerald-500'}`}
            aria-hidden="true"
          />
          <motion.span layout={!reduced ? 'position' : false}>
            {state === 'offline' ? offlinePillText(savedAt) : BACK_ONLINE_PILL}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (slot) return createPortal(pill, slot);

  return (
    <div
      className="fixed inset-x-0 z-[100] flex justify-center pointer-events-none"
      style={{ top: 'calc(max(env(safe-area-inset-top), 59px) + 0.5rem)' }}
    >
      {pill}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOffline } from '@/hooks/useOffline';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/hooks/useHaptics';
import { NotificationType } from '@capacitor/haptics';
import { useQueryClient } from '@tanstack/react-query';
import { BACK_ONLINE_TEXT, CARBON_QUERY_ROOTS } from '@/lib/voice/statesCopy';
import { OFFLINE_COPY } from '@/lib/voice/errorStatesCopy';
import { ErrorActionButton } from '@/components/errors/ErrorStateCard';
import { readTone } from '@/lib/tone';

export function OfflineIndicator() {
  const { isOffline, wasOffline, clearWasOffline } = useOffline();
  const [showReconnected, setShowReconnected] = useState(false);
  const { notification } = useHaptics();
  const queryClient = useQueryClient();
  // Newest cached carbon figures (the query cache is persisted to localStorage).
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

  // One Warning when dropping offline. No buzz on reconnect: the banner is enough.
  useEffect(() => {
    if (isOffline) {
      notification(NotificationType.Warning);
    }
  }, [isOffline, notification]);

  useEffect(() => {
    if (wasOffline) {
      // Design: refresh automatically on reconnect.
      void queryClient.refetchQueries({ type: 'active' });
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        clearWasOffline();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, clearWasOffline, queryClient]);

  // Refetch in place: a full reload lost scroll position, open sheets and form state.
  const handleRefresh = () => {
    // cancelRefetch: false, so a double tap joins the in-flight refetch instead of
    // cancelling it and firing every request again.
    void queryClient.refetchQueries({ type: 'active' }, { cancelRefetch: false });
    setShowReconnected(false);
    clearWasOffline();
  };

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring' as const, damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-[#e2ecfb] text-[#1d3f73] px-4 pb-3 shadow-lg"
          style={{ paddingTop: 'calc(max(env(safe-area-inset-top), 59px) + 0.75rem)' }}
          role="alert"
          aria-live="assertive"
          data-testid="offline-banner"
        >
          {/* Try now lives in the banner so it is on screen at 320x568 without scrolling. */}
          <div className="flex items-start gap-3 max-w-md mx-auto">
            <WifiOff className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm leading-[1.4]">
              <p>
                <b>{OFFLINE_COPY.title}</b> {OFFLINE_COPY.body(savedAt, readTone())}
              </p>
              <p className="mt-0.5 text-[13px] opacity-90">{OFFLINE_COPY.auto}</p>
            </div>
            <ErrorActionButton
              kind="secondary"
              label={OFFLINE_COPY.action}
              onClick={handleRefresh}
            />
          </div>
        </motion.div>
      )}

      {showReconnected && !isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring' as const, damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-emerald-500 text-emerald-950 px-4 py-3 shadow-lg"
          style={{ paddingTop: 'calc(max(env(safe-area-inset-top), 59px) + 0.75rem)' }}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">{BACK_ONLINE_TEXT}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-emerald-950 hover:bg-emerald-600/30"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

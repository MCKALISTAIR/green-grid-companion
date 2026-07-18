import { Clock } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';
import { motion, AnimatePresence } from 'framer-motion';

interface StaleDataBadgeProps {
  lastUpdated?: string | null;
  /** How many minutes old the data can be before showing the badge (default: 35 = one missed half-hour cycle + buffer) */
  thresholdMinutes?: number;
}

/**
 * Displays a subtle badge when data is stale (older than expected).
 * Shows "Cached" when offline, or "X min ago" when data is older than threshold.
 */
export function StaleDataBadge({ lastUpdated, thresholdMinutes = 35 }: StaleDataBadgeProps) {
  const { isOffline } = useOffline();

  if (!lastUpdated) return null;

  const updatedAt = new Date(lastUpdated).getTime();
  const now = Date.now();
  const ageMinutes = Math.round((now - updatedAt) / 60000);

  const isStale = isOffline || ageMinutes >= thresholdMinutes;

  const label = isOffline
    ? 'Cached data'
    : ageMinutes < 60
      ? `${ageMinutes}m ago`
      : ageMinutes < 1440
        ? `${Math.round(ageMinutes / 60)}h ago`
        : 'Old data';

  return (
    <AnimatePresence>
      {isStale && (
        <motion.span
          className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, scale: 0.8, y: -3 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -3 }}
          transition={{ duration: 0.2, ease: 'easeOut' as const }}
        >
          <Clock className="w-2.5 h-2.5" aria-hidden="true" />
          <span>{label}</span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}


import { useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorActionButton, ErrorStateCard } from '@/components/errors/ErrorStateCard';
import { readTone } from '@/lib/tone';
import { OFFLINE_COPY, toneBody } from '@/lib/voice/errorStatesCopy';
import { setOfflineEmptyStateShown } from '@/lib/heroStatusSlot';

/**
 * Design state 12, full version: offline and nothing cached at all. With
 * cached figures on screen the in-hero offline pill (#137) is used instead.
 */
export function OfflineEmptyState() {
  const queryClient = useQueryClient();
  useEffect(() => {
    setOfflineEmptyStateShown(true);
    return () => setOfflineEmptyStateShown(false);
  }, []);
  // Try now sits beside the copy (as in #146's banner) so it stays above the
  // bottom nav at 320x568 without scrolling.
  return (
    <ErrorStateCard
      testId="offline-empty-state"
      tint="blue"
      icon={WifiOff}
      title={OFFLINE_COPY.title}
    >
      <div className="mt-2 flex items-start gap-3">
        <p className="min-w-0 flex-1 text-sm leading-[1.4] text-[#3c4752] dark:text-muted-foreground">
          {toneBody(OFFLINE_COPY.body, readTone())} {OFFLINE_COPY.auto}
        </p>
        <ErrorActionButton
          kind="secondary"
          label={OFFLINE_COPY.action}
          onClick={() =>
            void queryClient.refetchQueries({ type: 'active' }, { cancelRefetch: false })
          }
        />
      </div>
    </ErrorStateCard>
  );
}

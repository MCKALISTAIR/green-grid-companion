import { useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorStateCard } from '@/components/errors/ErrorStateCard';
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
  return (
    <ErrorStateCard
      testId="offline-empty-state"
      tint="blue"
      icon={WifiOff}
      title={OFFLINE_COPY.title}
      body={toneBody(OFFLINE_COPY.body, readTone())}
      actions={[
        {
          label: OFFLINE_COPY.action,
          kind: 'secondary',
          onClick: () =>
            void queryClient.refetchQueries({ type: 'active' }, { cancelRefetch: false }),
        },
      ]}
    >
      <p className="mt-1 text-[13px] leading-[1.4] text-[#3c4752] dark:text-muted-foreground">
        {OFFLINE_COPY.auto}
      </p>
    </ErrorStateCard>
  );
}

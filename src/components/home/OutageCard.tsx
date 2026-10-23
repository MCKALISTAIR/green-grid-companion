import { AlertTriangle } from 'lucide-react';
import { ErrorStateCard } from '@/components/errors/ErrorStateCard';
import { readTone } from '@/lib/tone';
import { OUTAGE_COPY, toneBody } from '@/lib/voice/errorStatesCopy';

/** Design state 11. Only render when useGridFailureKind says 'outage'. */
export function OutageCard({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorStateCard
      testId="outage-card"
      tint="amber"
      icon={AlertTriangle}
      title={OUTAGE_COPY.title}
      body={toneBody(OUTAGE_COPY.body, readTone())}
      actions={[{ label: OUTAGE_COPY.action, onClick: onRetry }]}
    />
  );
}

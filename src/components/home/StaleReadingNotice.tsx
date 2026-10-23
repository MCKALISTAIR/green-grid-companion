import { AlertTriangle } from 'lucide-react';
import { ErrorStateCard } from '@/components/errors/ErrorStateCard';
import { isReadingStale } from '@/lib/voice/statesCopy';
import { STALE_COPY } from '@/lib/voice/errorStatesCopy';

interface StaleReadingNoticeProps {
  /** API half-hour start of the reading on screen (ISO). */
  readingFrom?: string;
  onRetry: () => void;
  nowMs?: number;
  /** Show even if not an hour old (e.g. the refresh just failed). */
  force?: boolean;
}

/** Design state 2: says plainly when the number on screen may be out of date. Always Plain. */
export function StaleReadingNotice({
  readingFrom,
  onRetry,
  nowMs,
  force,
}: StaleReadingNoticeProps) {
  if (!readingFrom || (!force && !isReadingStale(readingFrom, nowMs))) return null;
  return (
    <ErrorStateCard
      testId="stale-reading-notice"
      tint="amber"
      icon={AlertTriangle}
      title={STALE_COPY.title}
      body={STALE_COPY.body(new Date(readingFrom))}
      actions={[{ label: STALE_COPY.action, onClick: onRetry }]}
    />
  );
}

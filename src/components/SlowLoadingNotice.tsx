import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { ErrorStateCard } from '@/components/errors/ErrorStateCard';
import { readTone } from '@/lib/tone';
import { SLOW_COPY, toneBody } from '@/lib/voice/errorStatesCopy';

interface SlowLoadingNoticeProps {
  /** True while the first load is in flight. */
  active: boolean;
  onRetry: () => void;
  /** How long to wait before admitting it's slow. */
  delayMs?: number;
  className?: string;
}

/** Design state 1: "Still waiting for NESO" with a retry, only once a load has dragged on 8 s. */
export function SlowLoadingNotice({
  active,
  onRetry,
  delayMs = 8000,
  className,
}: SlowLoadingNoticeProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  if (!active || !slow) return null;

  return (
    <ErrorStateCard
      testId="slow-loading-notice"
      className={className}
      tint="amber"
      icon={Clock}
      title={SLOW_COPY.title}
      body={toneBody(SLOW_COPY.body, readTone())}
      actions={[{ label: SLOW_COPY.action, onClick: onRetry }]}
    />
  );
}

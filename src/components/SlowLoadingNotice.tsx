import { useEffect, useState } from 'react';
import { Hourglass, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SLOW_LOADING_COPY } from '@/lib/voice/statesCopy';
import { cn } from '@/lib/utils';

interface SlowLoadingNoticeProps {
  /** True while the first load is in flight. */
  active: boolean;
  onRetry: () => void;
  /** How long to wait before admitting it's slow. */
  delayMs?: number;
  className?: string;
}

/** "Still waiting" line with a retry, shown only once a load has dragged on. */
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
    <div
      role="status"
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm',
        className,
      )}
      data-testid="slow-loading-notice"
    >
      <Hourglass className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{SLOW_LOADING_COPY.title}</p>
        <p className="text-muted-foreground">{SLOW_LOADING_COPY.body}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">
        <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
        {SLOW_LOADING_COPY.retry}
      </Button>
    </div>
  );
}

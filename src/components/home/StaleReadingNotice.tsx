import { Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isReadingStale, staleReadingCopy } from '@/lib/voice/statesCopy';

interface StaleReadingNoticeProps {
  /** API half-hour start of the reading on screen (ISO). */
  readingFrom?: string;
  onRetry: () => void;
  nowMs?: number;
}

/** Says plainly when the number on screen is over an hour old. */
export function StaleReadingNotice({ readingFrom, onRetry, nowMs }: StaleReadingNoticeProps) {
  if (!readingFrom || !isReadingStale(readingFrom, nowMs)) return null;
  const copy = staleReadingCopy(new Date(readingFrom));
  return (
    <div
      role="status"
      data-testid="stale-reading-notice"
      className="mx-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-3 text-sm text-amber-800 dark:text-amber-200"
    >
      <Clock
        className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-semibold">{copy.title}</p>
        <p>{copy.body}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
          {copy.retry}
        </Button>
      </div>
    </div>
  );
}

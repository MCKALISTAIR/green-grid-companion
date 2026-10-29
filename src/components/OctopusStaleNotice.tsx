import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { octopusFreshness } from '@/lib/octopusFreshness';
import { OCTOPUS_FRESHNESS_COPY as FRESH } from '@/lib/voice/octopusLinkCopy';

/**
 * BH-127: says how old the newest Octopus reading is and, past 48 hours,
 * warns that the meter data has stopped updating, with what to do about it.
 * `variant="history"` is the short note for screens that show footprint totals.
 */
export function OctopusStaleNotice({
  latestConsumption,
  variant = 'settings',
  now,
}: {
  latestConsumption: string | null | undefined;
  variant?: 'settings' | 'history';
  now?: Date;
}) {
  const f = octopusFreshness(latestConsumption, now);
  if (!f.newest) return null;
  if (variant === 'history') {
    if (!f.stale) return null;
    return (
      <Alert
        role="status"
        className="border-amber-500/40 bg-amber-500/10"
        data-testid="octopus-stale-history"
      >
        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
        <AlertDescription className="text-xs">{FRESH.historyNote(f.newestLabel!)}</AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground" data-testid="octopus-newest-reading">
        {FRESH.newestReading(f.newestAgo!)}
      </p>
      {f.stale && (
        <Alert
          role="status"
          className="border-amber-500/40 bg-amber-500/10"
          data-testid="octopus-stale"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <AlertTitle className="text-sm">{FRESH.staleTitle}</AlertTitle>
          <AlertDescription className="text-xs">{FRESH.staleBody(f.newestLabel!)}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

import { formatDistance } from 'date-fns';
import { KeyRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { OCTOPUS_KEY_REJECTED_COPY as COPY } from '@/lib/voice/octopusLinkCopy';

/**
 * BH-127: Octopus answered 401/403 to the stored key. Says so plainly and
 * offers the existing link sheet, where the user enters a new key.
 */
export function OctopusKeyRejectedNotice({
  at,
  onRelink,
  now,
}: {
  at: Date | null;
  onRelink: () => void;
  now?: Date;
}) {
  const ago = at ? formatDistance(at, now ?? new Date(), { addSuffix: true }) : null;
  return (
    <Alert
      role="alert"
      className="border-red-500/40 bg-red-500/10"
      data-testid="octopus-key-rejected"
    >
      <KeyRound className="h-4 w-4 text-red-600" aria-hidden="true" />
      <AlertTitle className="text-sm">{COPY.title}</AlertTitle>
      <AlertDescription className="text-xs space-y-2">
        <p>{COPY.body}</p>
        {ago && <p className="text-muted-foreground">{COPY.since(ago)}</p>}
        <Button
          className="h-11 w-full font-semibold"
          onClick={onRelink}
          data-testid="octopus-key-rejected-relink"
        >
          {COPY.relink}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

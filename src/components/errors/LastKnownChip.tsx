import { Clock } from 'lucide-react';
import { lastKnownChip } from '@/lib/voice/errorStatesCopy';

/** Amber "Last known · HH:MM" chip for a hero showing a cached figure. */
export function LastKnownChip({ at }: { at: Date }) {
  return (
    <span
      data-testid="last-known-chip"
      className="inline-flex items-center gap-1 rounded-full bg-[#fff1d6] px-2.5 py-1 text-xs font-bold text-[#9a5b00] shadow-sm"
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      {lastKnownChip(at)}
    </span>
  );
}

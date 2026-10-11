import { CheckCircle2 } from 'lucide-react';

/**
 * "Zero-carbon power right now" chip. Lives in the hero HUD's normal flow
 * (under the band label), so it can't overlap the location header at any
 * viewport or safe-area inset. Only shown for a fresh 0 g reading.
 */
export function ZeroCarbonChip() {
  return (
    <div
      className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white shadow-md"
      role="status"
      data-testid="zero-carbon-chip"
    >
      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      <span className="truncate">Zero-carbon power right now</span>
    </div>
  );
}

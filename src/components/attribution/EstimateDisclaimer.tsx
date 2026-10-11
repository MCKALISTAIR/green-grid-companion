import { ESTIMATE_DISCLAIMER } from '@/lib/attribution';
import { cn } from '@/lib/utils';

export function EstimateDisclaimer({ className }: { className?: string }) {
  return <p className={cn('text-xs text-muted-foreground', className)}>{ESTIMATE_DISCLAIMER}</p>;
}

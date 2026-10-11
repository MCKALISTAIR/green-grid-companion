import { useEffect, useRef } from 'react';
import { Check, Clock3 } from 'lucide-react';
import type { NowOrWaitDecision as Decision } from '@/lib/nowOrWait';
import { voiceNowOrWait } from '@/lib/voice/nowOrWaitVoice';
import type { CommentaryTone } from '@/lib/tone';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface NowOrWaitDecisionProps {
  /** One decision object, shared with the Next 24 hours chart and the day sheet. */
  decision: Decision;
  tone: CommentaryTone;
}

/** Home "Now or wait?" card (spec §4.4). Logic is planLoad's; tails come from the voice module (#49). */
export function NowOrWaitDecision({ decision, tone }: NowOrWaitDecisionProps) {
  const go = decision.action !== 'wait';
  const { impactLight } = useHaptics();
  const prev = useRef(decision.action);
  useEffect(() => {
    if (prev.current !== decision.action) void impactLight();
    prev.current = decision.action;
  }, [decision.action, impactLight]);

  const { headline, detail, tail } = voiceNowOrWait(decision, tone);

  return (
    <section
      className="rounded-[20px] bg-card px-4 pb-3.5 pt-4 shadow-[var(--shadow-md)]"
      aria-label="Now or wait decision"
      data-tour="now-or-wait"
      data-testid="now-or-wait"
      data-window-start={decision.windowStart?.toISOString() ?? ''}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Now or wait?</span>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5 text-[12px] font-bold text-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          3-hour load
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <div
          className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-primary', go ? 'bg-primary-soft' : 'bg-muted')}
          aria-hidden
        >
          {go ? <Check className="h-[22px] w-[22px]" strokeWidth={2.6} /> : <Clock3 className="h-[22px] w-[22px]" strokeWidth={2.4} />}
        </div>
        <div className="min-w-0" aria-live="polite">
          <h2 className="text-[22px] font-extrabold leading-[1.2] tracking-[-0.02em] text-foreground">{headline}</h2>
          {tail && <p className="text-[13.5px] font-bold text-primary">{tail}</p>}
        </div>
      </div>
      <p className="mt-2.5 text-[14px] leading-[1.5] text-foreground">{detail}</p>
      <p className="mt-1.5 text-[12px] font-semibold leading-[1.4] text-muted-foreground">{decision.tip}</p>
    </section>
  );
}

/**
 * Cheeky flavour for the Now-or-wait card. The engine (src/lib/nowOrWait.ts)
 * owns the answer, the numbers, the times and the Plain copy; this file only
 * adds a short tail (and a Cheeky wording for "no forecast yet") on top.
 * It never changes the headline's meaning, a number or a time.
 */
import type { NowOrWaitDecision, NowOrWaitReason } from '@/lib/nowOrWait';
import type { CommentaryTone } from '@/lib/tone';

const UNIT = 'gCO₂/kWh';

/** One tail per reason. Each restates what the engine already decided. */
export const CHEEKY_TAILS: Partial<Record<NowOrWaitReason, string>> = {
  cleaner_later: 'Worth the wait.',
  now_is_best: 'As good as it gets. Off you go.',
  // "much" vs "any" in the detail line still tells these two apart.
  small_gain: 'Close enough. Crack on.',
  near_zero: 'Clean as it gets. Crack on.',
  flat: 'Steady all round. Whenever suits.',
};

export interface VoicedDecision {
  headline: string;
  detail: string;
  tail: string | null;
}

export function voiceNowOrWait(decision: NowOrWaitDecision, tone: CommentaryTone): VoicedDecision {
  if (tone === 'plain') {
    return { headline: decision.headline, detail: decision.detail, tail: null };
  }

  if (decision.reason === 'no_forecast') {
    const nowAvg = decision.plan.nowAvg;
    return {
      headline: "Forecast's running late",
      detail:
        nowAvg !== null
          ? `It's ${nowAvg} ${UNIT} right now. Can't say if later's better until the forecast turns up.`
          : "Can't say if later's better until the forecast turns up.",
      tail: null,
    };
  }

  return {
    headline: decision.headline,
    detail: decision.detail,
    tail: CHEEKY_TAILS[decision.reason] ?? null,
  };
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BatteryCharging, Clock3, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ForecastData } from '@/lib/carbonApi';
import { getNowOrWaitDecision, isAnyTimePlan } from '@/lib/nowOrWait';
import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/utils';
import { useEnergyFacts } from '@/hooks/useEnergyFacts';
import { voiceNowOrWait } from '@/lib/voice/nowOrWaitVoice';
import { markUsefulMoment } from '@/lib/firstLaunch';

interface NowOrWaitDecisionProps {
  intensity: number;
  forecast: ForecastData[];
  /** Half-hour start of the live reading; a stale one never shows "Now". */
  lastUpdated?: string | null;
}

/** Re-judge every minute so a card left open goes stale instead of staying "Now". */
function useMinuteTick(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/**
 * Primary home-sheet action: answer "use energy now or wait?"
 * before any secondary insight chrome.
 */
export function NowOrWaitDecision({ intensity, forecast, lastUpdated }: NowOrWaitDecisionProps) {
  const now = useMinuteTick();
  const decision = getNowOrWaitDecision(intensity, forecast, now, lastUpdated ?? null);
  const isUseNow = decision.action === 'use_now';
  const countdown = useCountdown(decision.countdownTarget);
  const { tone } = useEnergyFacts();
  const voiced = voiceNowOrWait(decision, tone);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={cn(
        'sheet-surface px-4 py-4',
        isUseNow ? 'bg-intensity-very-low/[0.1] border-intensity-very-low/25' : 'border-border/60',
      )}
      aria-label="Now or wait decision"
      data-tour="now-or-wait"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
            isUseNow ? 'bg-intensity-very-low/20' : 'bg-muted',
          )}
        >
          {isUseNow ? (
            <BatteryCharging className="w-5 h-5 text-intensity-very-low-text" />
          ) : (
            <Clock3 className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              className={cn(
                'text-lg font-semibold tracking-tight font-display',
                isUseNow ? 'text-intensity-very-low-text' : 'text-foreground',
              )}
            >
              {voiced.headline}
            </h2>
            {isUseNow && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-intensity-very-low/20 text-intensity-very-low-text">
                <Leaf className="w-3 h-3" />
                {isAnyTimePlan(decision) ? 'Any time' : 'Now'}
              </span>
            )}
            {!isUseNow && countdown && (
              <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {countdown}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-snug">
            {voiced.detail}
            {voiced.tail && <span className="text-foreground/80"> {voiced.tail}</span>}
          </p>
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{decision.tip}</p>

          <Link
            to="/planner"
            onClick={markUsefulMoment}
            className={cn(
              'tap-target inline-flex items-center gap-1.5 mt-2 text-sm font-semibold transition-colors',
              isUseNow
                ? 'text-intensity-very-low-text hover:text-intensity-very-low-text'
                : 'text-primary hover:text-primary/80',
            )}
          >
            Plan a load
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

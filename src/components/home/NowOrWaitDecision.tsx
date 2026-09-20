import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight, BatteryCharging, Clock3, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ForecastData } from '@/lib/carbonApi';
import { getBestWorstWindows } from '@/lib/forecastWindows';
import { getDayLabel } from '@/lib/date-utils';
import { getSmartTip } from '@/lib/getSmartTip';
import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/utils';

interface NowOrWaitDecisionProps {
  intensity: number;
  forecast: ForecastData[];
}

/**
 * Primary home-sheet action: answer "use energy now or wait?"
 * before any secondary insight chrome.
 */
export function NowOrWaitDecision({ intensity, forecast }: NowOrWaitDecisionProps) {
  const windows = getBestWorstWindows(forecast);
  const now = new Date();
  const isBestNow = windows ? now >= windows.bestStart && now <= windows.bestEnd : intensity <= 100;
  const countdown = useCountdown(windows && !isBestNow ? windows.bestStart : null);
  const tip = getSmartTip(intensity, forecast);

  const headline = isBestNow
    ? 'Use energy now'
    : windows
      ? `Wait until ${format(windows.bestStart, 'HH:mm')}`
      : 'Check the forecast';

  const detail = isBestNow
    ? windows
      ? `Cleanest window open until ${format(windows.bestEnd, 'HH:mm')} · ~${windows.minAvg} gCO₂/kWh`
      : 'Grid is relatively clean right now'
    : windows
      ? `${format(windows.bestStart, 'HH:mm')} → ${format(windows.bestEnd, 'HH:mm')} ${getDayLabel(new Date(windows.bestStart.getTime() - 60_000))} · ~${windows.minAvg} gCO₂/kWh`
      : tip;

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={cn(
        'rounded-2xl px-4 py-4 border',
        isBestNow
          ? 'bg-intensity-very-low/[0.1] border-intensity-very-low/25'
          : 'bg-muted/40 border-border/60',
      )}
      aria-label="Now or wait decision"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
            isBestNow ? 'bg-intensity-very-low/20' : 'bg-muted',
          )}
        >
          {isBestNow ? (
            <BatteryCharging className="w-5 h-5 text-intensity-very-low" />
          ) : (
            <Clock3 className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              className={cn(
                'text-lg font-semibold tracking-tight font-display',
                isBestNow ? 'text-intensity-very-low' : 'text-foreground',
              )}
            >
              {headline}
            </h2>
            {isBestNow && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-intensity-very-low/20 text-intensity-very-low">
                <Leaf className="w-3 h-3" />
                Now
              </span>
            )}
            {!isBestNow && countdown && (
              <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                in {countdown}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-snug">{detail}</p>
          {windows && (
            <p className="text-xs text-muted-foreground/90 leading-snug line-clamp-2">{tip}</p>
          )}

          <Link
            to="/planner"
            className={cn(
              'inline-flex items-center gap-1.5 mt-2 text-sm font-semibold transition-colors',
              isBestNow
                ? 'text-intensity-very-low hover:text-intensity-very-low/80'
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

import { BatteryCharging, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatLondonTime, londonDayLabel } from '@/lib/londonTime';
import { useCountdown } from '@/hooks/useCountdown';
import { motion } from 'framer-motion';
import type { ForecastData } from '@/lib/carbonApi';
import { getBestWorstWindows, isWorstWindowWorthFlagging } from '@/lib/forecastWindows';
import { getNowOrWaitDecision } from '@/lib/nowOrWait';

interface BestTimeCardProps {
  forecast: ForecastData[];
  /** Live intensity, so the worst-window card agrees with the now-or-wait card. */
  intensity?: number;
}

export function BestTimeSlot({ forecast }: BestTimeCardProps) {
  const data = getBestWorstWindows(forecast);
  const now = new Date();
  const isNow = data ? now >= data.bestStart && now <= data.bestEnd : false;
  const countdown = useCountdown(data ? (isNow ? null : data.bestStart) : null);

  if (!data) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.025, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 bg-intensity-very-low/[0.08] border-intensity-very-low/20 cursor-pointer shadow-none hover:bg-intensity-very-low/[0.12] transition-colors rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-intensity-very-low/15 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-intensity-very-low" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <BatteryCharging className="w-4 h-4 text-intensity-very-low" />
              <span className="text-sm font-medium text-foreground">
                {isNow ? "Load-shift now. It's the best time." : 'Best time to load-shift'}
              </span>
              {isNow && (
                <span className="flex items-center gap-1.5 bg-intensity-very-low/20 text-intensity-very-low px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-intensity-very-low opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-intensity-very-low"></span>
                  </span>
                  Now
                </span>
              )}
              {!isNow && countdown && (
                <span className="text-[10px] font-semibold bg-intensity-very-low/15 text-intensity-very-low px-1.5 py-0.5 rounded-full tabular-nums">
                  {countdown}
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-intensity-very-low">
              {formatLondonTime(data.bestStart)} → {formatLondonTime(data.bestEnd)}{' '}
              <span className="text-sm font-medium ml-1 text-muted-foreground">
                {londonDayLabel(data.bestStart)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Average: {data.minAvg} gCO₂/kWh</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function WorstTimeSlot({ forecast, intensity }: BestTimeCardProps) {
  const data = getBestWorstWindows(forecast);
  const now = new Date();
  const isNow = data ? now >= data.worstStart && now <= data.worstEnd : false;
  const countdown = useCountdown(data ? (isNow ? null : data.worstStart) : null);

  // A flat forecast has no real "worst" stretch worth warning about.
  if (!data || !isWorstWindowWorthFlagging(data)) return null;

  // If the worst stretch is now but the home card says "Now's good" (nothing
  // much cleaner soon), don't tell people to avoid it.
  const nowAction =
    isNow && intensity && intensity > 0
      ? getNowOrWaitDecision(intensity, forecast, now).action
      : null;
  const title = isNow && nowAction === 'use_now' ? 'Dirtiest stretch of the forecast' : 'Avoid high usage';

  return (
    <motion.div
      whileHover={{ scale: 1.025, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 bg-intensity-high/[0.08] border-intensity-high/20 cursor-pointer shadow-none hover:bg-intensity-high/[0.12] transition-colors rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-intensity-high/15 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-intensity-high" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">{title}</span>
              {isNow && (
                <span className="flex items-center gap-1.5 bg-intensity-high/20 text-intensity-high px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-intensity-high opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-intensity-high"></span>
                  </span>
                  Now
                </span>
              )}
              {!isNow && countdown && (
                <span className="text-[10px] font-semibold bg-intensity-high/15 text-intensity-high px-1.5 py-0.5 rounded-full tabular-nums">
                  {countdown}
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-intensity-high">
              {formatLondonTime(data.worstStart)} → {formatLondonTime(data.worstEnd)}{' '}
              <span className="text-sm font-medium ml-1 text-muted-foreground">
                {londonDayLabel(data.worstStart)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Average: {data.maxAvg} gCO₂/kWh</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/** @deprecated Use BestTimeSlot and WorstTimeSlot individually */
export function BestTimeCard({ forecast }: BestTimeCardProps) {
  return (
    <div className="space-y-3">
      <BestTimeSlot forecast={forecast} />
      <WorstTimeSlot forecast={forecast} />
    </div>
  );
}

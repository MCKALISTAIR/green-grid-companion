import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ForecastData, IntensityData } from '@/lib/carbonApi';
import { formatDayTitle, getDailyStats, type DailyStats } from '@/lib/dayForecast';
import { formatLondonTime, londonDateKey } from '@/lib/londonTime';
import { bandLabel } from '@/lib/homeCopy';

const KEY = 'gridsense-more-insights-open';
const UNIT = 'gCO\u2082/kWh';
type Band = ForecastData['intensity']['index'];
const BAND_ORDER: Band[] = ['very low', 'low', 'moderate', 'high', 'very high'];

function readOpen(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'false';
  } catch {
    return true;
  }
}

/** Status row on a 48h day card (spec §4.8). */
export function dayStatus(d: Pick<DailyStats, 'min' | 'max' | 'allZero' | 'spread'>, peakBand: Band | null): string {
  if (d.min === null || d.max === null) return 'No data yet';
  if (d.allZero) return 'Zero carbon all day';
  if (d.spread === 'near_zero') return 'At or near zero all day';
  if (d.min === d.max) return `${bandLabel(peakBand ?? 'moderate')} all day`;
  return `Peaks ${peakBand ?? 'moderate'}`;
}

/** Highest API band among a London day's upcoming half hours. */
export function peakBandFor(forecast: ForecastData[], date: string, nowMs: number): Band | null {
  let best: Band | null = null;
  for (const f of forecast) {
    if (Date.parse(f.to) <= nowMs || londonDateKey(new Date(f.from)) !== date) continue;
    if (typeof f.intensity?.forecast !== 'number' || !Number.isFinite(f.intensity.forecast)) continue;
    const b = f.intensity.index;
    if (!best || BAND_ORDER.indexOf(b) > BAND_ORDER.indexOf(best)) best = b;
  }
  return best;
}

interface MoreInsightsProps {
  forecast: ForecastData[];
  region: string;
  isRegional: boolean;
  intensity: number | null;
  gbIntensity: IntensityData['intensity'] | null;
  now: Date;
  onOpenDay: (dateKey: string) => void;
}

/** More insights: 48-hour overview + region vs GB + cleanest half hour (spec §4.8). */
export function MoreInsights({ forecast, region, isRegional, intensity, gbIntensity, now, onOpenDay }: MoreInsightsProps) {
  const [open, setOpen] = useState(readOpen);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(open));
    } catch {
      /* ignore */
    }
  }, [open]);

  const todayKey = londonDateKey(now);
  const nowMs = now.getTime();
  const [y, m, d] = todayKey.split('-').map(Number);
  const tomorrowKey = londonDateKey(new Date(Date.UTC(y, m - 1, d + 1, 12)));
  const days = useMemo(() => {
    const upcoming = forecast.filter((f) => Date.parse(f.to) > nowMs);
    const stats = getDailyStats(upcoming, now);
    // Always two cards (Rest of today, Tomorrow); a missing day says "No data yet", never 0.
    return [todayKey, tomorrowKey].map(
      (date) =>
        stats.find((s) => s.date === date) ?? {
          date,
          label: date === todayKey ? 'Today' : 'Tomorrow',
          min: null,
          max: null,
          avg: null,
          minActual: null,
          maxActual: null,
          avgActual: null,
          hasActuals: false,
          actualsEstimated: false,
          allZero: false,
          spread: null,
        },
    );
  }, [forecast, now, nowMs, todayKey, tomorrowKey]);

  const next24 = forecast.filter(
    (f) =>
      Date.parse(f.to) > nowMs &&
      Date.parse(f.from) < nowMs + 24 * 3600_000 &&
      typeof f.intensity?.forecast === 'number' &&
      Number.isFinite(f.intensity.forecast) &&
      f.intensity.forecast >= 0,
  );
  let cleanest: ForecastData | null = null;
  for (const f of next24) if (!cleanest || f.intensity.forecast < cleanest.intensity.forecast) cleanest = f;
  const allEqual = next24.length > 0 && next24.every((f) => f.intensity.forecast === next24[0].intensity.forecast);

  return (
    <section className="rounded-[20px] bg-card p-4 shadow-[var(--shadow-md)]" data-testid="more-insights">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-extrabold leading-[1.25] tracking-[-0.01em]">More insights</h3>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="-mr-2 min-h-11 rounded-full px-3 text-[13.5px] font-bold text-primary">
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      {open && (
        <div className="mt-1 space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">48-hour overview</p>
          <div className="grid grid-cols-2 gap-2">
            {days.map((day) => {
              const pb = peakBandFor(forecast, day.date, nowMs);
              const missing = day.min === null || day.max === null;
              const value = missing ? '\u2014' : day.min === day.max ? `${day.min}` : `${day.min}\u2013${day.max}`;
              const label = day.date === todayKey ? 'Rest of today' : 'Tomorrow';
              const status = dayStatus(day, pb);
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => onOpenDay(day.date)}
                  className="min-w-0 rounded-[16px] border border-border/80 bg-[hsl(210_30%_98.5%)] p-3 text-left dark:bg-[hsl(220_22%_17%)]"
                  aria-label={`${label}, ${formatDayTitle(day.date)}: ${missing ? 'no data yet' : `${value} ${UNIT}. ${status}`}. Open half-hourly detail.`}
                  data-testid="overview-day"
                >
                  <span className="flex items-center justify-between">
                    <span className="text-[13px] font-bold">{label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </span>
                  <span className="block text-[11.5px] font-semibold text-muted-foreground">{formatDayTitle(day.date)}</span>
                  <span className="mt-1.5 block text-[22px] font-extrabold leading-tight tabular-nums">{value}</span>
                  <span className="block text-[11.5px] font-semibold text-muted-foreground">{missing ? '\u00a0' : UNIT}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[12px] font-bold">
                    {pb && !missing && (
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `hsl(var(--intensity-${pb.replace(' ', '-')}))` }} aria-hidden />
                    )}
                    {status}
                  </span>
                </button>
              );
            })}
          </div>

          {isRegional && intensity !== null && gbIntensity && typeof gbIntensity.forecast === 'number' && (
            <div className="flex items-start justify-between gap-3 border-t border-border/70 pt-3" data-testid="region-vs-gb">
              <div className="min-w-0">
                <p className="text-[14px] font-bold">{region} vs GB right now</p>
                <p className="text-[12px] font-semibold text-muted-foreground">GB as a whole is {gbIntensity.index} for this half hour.</p>
              </div>
              <p className="shrink-0 text-[15px] font-extrabold tabular-nums">
                {intensity} vs {gbIntensity.forecast}
              </p>
            </div>
          )}

          {cleanest && (
            <div className="flex items-start justify-between gap-3 border-t border-border/70 pt-3" data-testid="cleanest-half-hour">
              <p className="text-[14px] font-bold">Cleanest half hour, next 24h</p>
              <p className="shrink-0 text-[15px] font-extrabold tabular-nums">
                {allEqual ? `${cleanest.intensity.forecast}, every one` : `${cleanest.intensity.forecast} at ${formatLondonTime(new Date(cleanest.from))}`}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

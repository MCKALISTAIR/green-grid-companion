import { useMemo } from 'react';
import type { ForecastData } from '@/lib/carbonApi';
import { classifySpread } from '@/lib/forecastWindows';
import { formatLondonTime } from '@/lib/londonTime';
import { MISSING_SLOTS_NOTE, shadedWindow, type LoadPlan } from '@/lib/nowOrWait';
import { formatWindow } from '@/lib/dayForecast';
import { COPY } from '@/lib/homeCopy';
import {
  BAND_KEYS,
  IntensityLineChart,
  bandFill,
  bandName,
  toChartPoints,
  type ChartPoint,
} from '@/components/forecast/IntensityLineChart';

const SLOT = 30 * 60_000;

export interface Next24Model {
  t0: number;
  t1: number;
  points: ChartPoint[];
  spread: ReturnType<typeof classifySpread>;
  allZero: boolean;
  min: number | null;
  max: number | null;
  avg: number | null;
  lastTo: number | null;
  internalGaps: number;
}

/** Points and stats for a next-24-hours chart, from the start of the current half hour. */
export function buildNext24(forecast: ForecastData[], now: Date): Next24Model {
  const t0 = Math.floor(now.getTime() / SLOT) * SLOT;
  const t1 = t0 + 24 * 3600_000;
  const points = toChartPoints(forecast, t0, t1, { includeActual: false, includeEstimate: false });
  const vals = points.map((p) => p.forecast).filter((v): v is number => v !== null);
  let first = -1;
  let last = -1;
  points.forEach((p, i) => {
    if (p.forecast !== null) {
      if (first < 0) first = i;
      last = i;
    }
  });
  let internalGaps = 0;
  for (let i = Math.max(first, 0); i <= last; i++) if (points[i].forecast === null) internalGaps++;
  return {
    t0,
    t1,
    points,
    spread: classifySpread(vals),
    allZero: vals.length > 0 && vals.every((v) => v === 0),
    min: vals.length ? Math.min(...vals) : null,
    max: vals.length ? Math.max(...vals) : null,
    avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
    lastTo: last >= 0 ? points[last].to : null,
    internalGaps,
  };
}

/** sr-only summary: "Forecast from 92 to 146 gCO₂/kWh. Now 119, moderate. Cleanest 3 hours: 23:00 to 02:00, around 97." */
export function next24Summary(
  m: Next24Model,
  win: { start: Date; end: Date; avg: number } | null,
  nowPoint: { forecast: number | null; index: string | null } | null,
): string {
  if (m.min === null || m.max === null) return `${COPY.chartTitle}: forecast not in yet.`;
  if (m.allZero) return COPY.chartZero;
  const parts = [m.min === m.max ? `Forecast steady at ${m.min} gCO\u2082/kWh.` : `Forecast from ${m.min} to ${m.max} gCO\u2082/kWh.`];
  if (nowPoint?.forecast != null) parts.push(`Now ${nowPoint.forecast}${nowPoint.index ? `, ${nowPoint.index}` : ''}.`);
  if (win) parts.push(`Cleanest 3 hours: ${formatLondonTime(win.start)} to ${formatLondonTime(win.end)}, around ${win.avg}.`);
  return parts.join(' ');
}

/** Caption pieces shared by home and Planner. */
export function next24Notes(m: Next24Model): string {
  const out: string[] = [];
  if (m.lastTo !== null && m.lastTo < m.t1 - SLOT) out.push(COPY.chartRunsTo(formatLondonTime(new Date(m.lastTo))));
  if (m.internalGaps > 0) out.push(MISSING_SLOTS_NOTE);
  return out.join(' ');
}

export function BandKey() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] font-semibold text-foreground" aria-label="Band key">
      {BAND_KEYS.map((b) => (
        <li key={b} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: bandFill(b) }} aria-hidden />
          {bandName(b)}
        </li>
      ))}
    </ul>
  );
}

interface NextForecastCardProps {
  forecast: ForecastData[];
  plan: LoadPlan;
  region: string;
  now: Date;
  /** Hide the Now dot (stale reading). */
  showNow?: boolean;
  /** Extra caption (offline cached note). */
  note?: string | null;
}

/** Home "Next 24 hours" card (spec §4.5, chart Option A). */
export function NextForecastCard({ forecast, plan, region, now, showNow = true, note }: NextForecastCardProps) {
  const m = useMemo(() => buildNext24(forecast, now), [forecast, now]);
  const varied = m.spread === 'varied';
  const win = varied ? shadedWindow(plan) : null;
  const nowPoint = m.points.find((p) => p.from <= now.getTime() && p.to > now.getTime()) ?? null;
  const flatNote = !varied && m.spread !== null ? (m.allZero ? COPY.chartZero : COPY.chartSteady(m.avg ?? 0)) : null;
  const caption = [win ? COPY.chartCaption : !varied && m.spread !== null ? COPY.chartNoWindow : '', next24Notes(m), note ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <section className="rounded-[20px] bg-card p-4 shadow-[var(--shadow-md)]" data-tour="forecast-chart" data-testid="next24-card">
      <h3 className="text-[17px] font-extrabold leading-[1.25] tracking-[-0.01em]">{COPY.chartTitle}</h3>
      <p className="mt-0.5 text-[12px] font-semibold text-muted-foreground">{COPY.chartSubtitle(region)}</p>
      <div className="mt-3">
        <IntensityLineChart
          mode="next24"
          points={m.points}
          t0={m.t0}
          t1={m.t1}
          height={196}
          nowMs={showNow ? now.getTime() : null}
          window={win}
          windowLabel={win ? `Best ${formatWindow(win)}` : null}
          flatNote={flatNote}
          ariaLabel={`${region} forecast, next 24 hours`}
          summary={next24Summary(m, win, nowPoint)}
          testId="next24-chart"
        />
      </div>
      <BandKey />
      {caption && (
        <p className="mt-2 text-[12px] font-semibold leading-[1.4] text-muted-foreground" data-testid="next24-caption">
          {caption}
        </p>
      )}
    </section>
  );
}

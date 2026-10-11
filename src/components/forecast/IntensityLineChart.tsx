import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ForecastData } from '@/lib/carbonApi';
import { yDomain, layoutChips, slotValueText, formatWindow, type DaySlot } from '@/lib/dayForecast';
import { formatLondonTime } from '@/lib/londonTime';
import {
  axisLabels,
  chipWidth,
  dayTicks,
  monotonePath,
  placeTooltip,
  runs,
  sixHourTicks,
  type Tick,
} from '@/lib/intensityChart';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

export type Band = ForecastData['intensity']['index'];

/** One half hour on the chart. `null` values are gaps, never 0. */
export type ChartPoint = Pick<DaySlot, 'from' | 'to' | 'forecast' | 'actual' | 'estimate' | 'index'> & {
  /** Optional readout label ("13:00", or "Tue 6 19:00" for History). */
  time?: string;
};

export const BAND_KEYS: Band[] = ['very low', 'low', 'moderate', 'high', 'very high'];
const bandVar = (b: Band | null) => (b ?? 'moderate').replace(' ', '-');
export const bandFill = (b: Band | null) => `hsl(var(--intensity-${bandVar(b)}))`;
export const bandInk = (b: Band | null) => `hsl(var(--intensity-${bandVar(b)}-ink))`;
export const bandName = (b: Band | null) => (b ? b[0].toUpperCase() + b.slice(1) : '');

const UNIT = 'gCO\u2082/kWh';
const EASE = [0.16, 1, 0.3, 1] as const;
const PAD_L = 4;
const PAD_R = 40;
const PAD_B = 24;

export interface IntensityLineChartProps {
  mode: 'next24' | 'day';
  points: ChartPoint[];
  /** Visible time range (ms). */
  t0: number;
  t1: number;
  height: number;
  /** "Now" instant, or null to hide the Now marker. */
  nowMs?: number | null;
  /** Window to shade (the same LoadWindow the card describes). */
  window?: { start: Date; end: Date } | null;
  /** Chip text over/inside the window ("Best 11:00–14:00" / "11:00–14:00"). */
  windowLabel?: string | null;
  /** Line styling: band-coloured forecast (Option A) or series colours (dashed forecast). */
  forecastStyle?: 'band' | 'series';
  /** Mark the highest half hour (only when spread is varied). */
  showExtremes?: boolean;
  extremeLabel?: (p: ChartPoint) => string;
  ticks?: 'six' | 'week' | 'month';
  /** Centred pill note (flat / zero). */
  flatNote?: string | null;
  /** Empty-state copy when there are no forecast values. */
  emptyTitle?: string;
  emptyDetail?: string;
  /** Deadline overlay (Planner). */
  deadlineMs?: number | null;
  deadlineLabel?: string;
  ariaLabel: string;
  /** Visible-to-AT summary read before the chart. */
  summary: string;
  /** Called with the scrubbed index (null when released). */
  onScrubChange?: (index: number | null) => void;
  /** Readout index when not scrubbing (defaults to the now slot). */
  defaultIndex?: number | null;
  className?: string;
  testId?: string;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function IntensityLineChart({
  mode,
  points,
  t0,
  t1,
  height,
  nowMs = null,
  window: win = null,
  windowLabel = null,
  forecastStyle = mode === 'next24' ? 'band' : 'series',
  showExtremes = false,
  extremeLabel,
  ticks = 'six',
  flatNote = null,
  emptyTitle = 'Forecast not in yet',
  emptyDetail = 'Pull down to try again.',
  deadlineMs = null,
  deadlineLabel,
  ariaLabel,
  summary,
  onScrubChange,
  defaultIndex = null,
  className,
  testId,
}: IntensityLineChartProps) {
  const uid = useId().replace(/:/g, '');
  const [wrapRef, width] = useWidth();
  const reduced = useReducedMotion();
  const { selection } = useHaptics();
  const [scrub, setScrub] = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const draggingRef = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHaptic = useRef<number | null>(null);

  const padT = mode === 'next24' ? 38 : 34;
  const iw = Math.max(0, width - PAD_L - PAD_R);
  const ih = Math.max(0, height - padT - PAD_B);
  const X = useCallback((t: number) => PAD_L + ((t - t0) / (t1 - t0)) * iw, [t0, t1, iw]);

  const visible = useMemo(() => points.filter((p) => p.to > t0 && p.from < t1), [points, t0, t1]);
  const showActual = visible.some((p) => p.actual !== null);
  const showEstimate = !showActual && visible.some((p) => p.estimate !== null);
  const plotted = useMemo(
    () =>
      visible.flatMap((p) => [p.forecast, showActual ? p.actual : null, showEstimate ? p.estimate : null]).filter(
        (v): v is number => v !== null,
      ),
    [visible, showActual, showEstimate],
  );
  const hasForecast = visible.some((p) => p.forecast !== null);
  const pMin = plotted.length ? Math.min(...plotted) : null;
  const pMax = plotted.length ? Math.max(...plotted) : null;
  const [y0, y1] = yDomain(pMin, pMax);
  const Y = useCallback((v: number) => padT + ih - ((v - y0) / (y1 - y0)) * ih, [padT, ih, y0, y1]);
  const labels = axisLabels(pMin, pMax, Y);

  const nowIdx = nowMs !== null ? visible.findIndex((p) => p.from <= nowMs && p.to > nowMs) : -1;
  const nowPoint = nowIdx >= 0 ? visible[nowIdx] : null;
  const readIndex = scrub ?? defaultIndex ?? (nowIdx >= 0 ? nowIdx : null);

  const tickList: Tick[] = ticks === 'six' ? sixHourTicks(t0, t1) : dayTicks(t0, t1, ticks);

  const mid = (p: ChartPoint) => (p.from + p.to) / 2;
  const series = (key: 'forecast' | 'actual' | 'estimate') =>
    runs(visible, (p) => p[key]).map((r) => monotonePath(r.map((p) => ({ x: X(mid(p)), y: Y(p[key] as number) }))));

  const forecastPaths = width > 0 ? series('forecast') : [];
  const actualPaths = width > 0 && showActual ? series('actual') : [];
  const estimatePaths = width > 0 && showEstimate ? series('estimate') : [];
  const areaPaths =
    width > 0 && forecastStyle === 'band'
      ? runs(visible, (p) => p.forecast).map((r) => {
          const d = monotonePath(r.map((p) => ({ x: X(mid(p)), y: Y(p.forecast as number) })));
          return `${d} L${X(mid(r[r.length - 1]))},${padT + ih} L${X(mid(r[0]))},${padT + ih} Z`;
        })
      : [];

  const stops = (kind: 'fill' | 'ink') =>
    visible.map((p, i) => {
      const a = Math.max(0, Math.min(100, ((X(p.from) - PAD_L) / (iw || 1)) * 100));
      const b = Math.max(0, Math.min(100, ((X(p.to) - PAD_L) / (iw || 1)) * 100));
      const c = kind === 'fill' ? bandFill(p.index) : bandInk(p.index);
      return [
        <stop key={`${i}a`} offset={`${a}%`} style={{ stopColor: c }} />,
        <stop key={`${i}b`} offset={`${b}%`} style={{ stopColor: c }} />,
      ];
    });

  // Extremes (highest forecast half hour).
  let dirtiest: ChartPoint | null = null;
  if (showExtremes) for (const p of visible) if (p.forecast !== null && (!dirtiest || p.forecast > (dirtiest.forecast as number))) dirtiest = p;

  // Chips on the top lane go through layoutChips so none overlap.
  const chipTexts: Array<{ id: string; x: number; text: string }> = [];
  const winXa = win ? X(Math.max(win.start.getTime(), t0)) : 0;
  const winXb = win ? X(Math.min(win.end.getTime(), t1)) : 0;
  if (win && windowLabel && mode === 'next24' && scrub === null) chipTexts.push({ id: 'win', x: (winXa + winXb) / 2, text: windowLabel });
  if (dirtiest && extremeLabel) chipTexts.push({ id: 'dirty', x: X(mid(dirtiest)), text: extremeLabel(dirtiest) });
  if (nowPoint && mode === 'day') chipTexts.push({ id: 'now', x: X(nowMs as number) + 21, text: 'Now' });
  const placed = layoutChips(
    chipTexts.map((c) => ({ id: c.id, x: c.x, width: c.id === 'now' ? 32 : chipWidth(c.text, c.id === 'dirty' ? 6.1 : 6.3, 16) })),
    width,
  );
  const chipTop = (lane: number, id: string) => (id === 'win' ? padT - 30 : padT - 26) - lane * 22;

  // Scrub handling.
  const setIndex = useCallback(
    (i: number | null) => {
      setScrub(i);
      onScrubChange?.(i);
      if (i !== null && i !== lastHaptic.current) {
        lastHaptic.current = i;
        void selection();
      }
    },
    [onScrubChange, selection],
  );
  const indexAt = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const t = t0 + ((clientX - rect.left - PAD_L) / (iw || 1)) * (t1 - t0);
    let best = -1;
    let bestD = Infinity;
    visible.forEach((p, i) => {
      if (p.forecast === null) return;
      const d = Math.abs(mid(p) - t);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best >= 0 ? best : null;
  };
  const clearFade = () => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = null;
  };
  useEffect(() => () => clearFade(), []);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasForecast) return;
    draggingRef.current = true;
    clearFade();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setTooltipVisible(true);
    setIndex(indexAt(e.clientX, e.currentTarget));
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasForecast) return;
    if (!draggingRef.current && e.pointerType !== 'mouse') return;
    clearFade();
    setTooltipVisible(true);
    setIndex(indexAt(e.clientX, e.currentTarget));
  };
  const release = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    const delay = e.pointerType === 'mouse' ? 0 : 1500;
    clearFade();
    fadeTimer.current = setTimeout(() => {
      setTooltipVisible(false);
      setIndex(null);
    }, delay);
  };
  const usable = visible.map((p, i) => (p.forecast !== null ? i : -1)).filter((i) => i >= 0);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!usable.length) return;
    const cur = readIndex ?? usable[0];
    const pos = Math.max(0, usable.indexOf(cur));
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = usable[Math.min(usable.length - 1, pos + 1)];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = usable[Math.max(0, pos - 1)];
    else if (e.key === 'PageUp') next = usable[Math.min(usable.length - 1, pos + 6)];
    else if (e.key === 'PageDown') next = usable[Math.max(0, pos - 6)];
    else if (e.key === 'Home') next = usable[0];
    else if (e.key === 'End') next = usable[usable.length - 1];
    else if (e.key === 'Escape') {
      setTooltipVisible(false);
      setIndex(null);
      return;
    }
    if (next === null || next === undefined) return;
    e.preventDefault();
    clearFade();
    setTooltipVisible(true);
    setIndex(next);
  };

  const sp = scrub !== null ? visible[scrub] : null;
  const spX = sp ? X(mid(sp)) : 0;
  const spY = sp && sp.forecast !== null ? Y(sp.forecast) : 0;
  const extraLine = sp ? (showActual && sp.actual !== null ? `Actual ${sp.actual}` : showEstimate && sp.estimate !== null ? `Est ${sp.estimate}` : null) : null;
  const tipW = 128;
  const tipH = extraLine ? 74 : 58;
  const tip = sp ? placeTooltip({ x: spX, y: spY, w: tipW, h: tipH, chartW: width, chartH: height }) : null;

  const valueText = readIndex !== null ? slotValueText({ ...visible[readIndex], time: visible[readIndex]?.time ?? formatLondonTime(new Date(visible[readIndex]?.from ?? t0)) }) : 'No data';

  const lineReveal = reduced
    ? {}
    : { initial: { width: 0 }, animate: { width: width + 20 }, transition: { duration: 0.6, ease: EASE } };

  const deadlineX = deadlineMs !== null && deadlineMs > t0 && deadlineMs < t1 ? X(deadlineMs) : null;

  return (
    <div className={cn('relative', className)} data-testid={testId}>
      <p className="sr-only">{summary}</p>
      <div
        ref={wrapRef}
        role="group"
        aria-label={ariaLabel}
        className="relative select-none"
        style={{ height, overflow: 'visible' }}
      >
        {width > 0 && (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block overflow-visible">
            <defs>
              <linearGradient id={`${uid}f`} gradientUnits="userSpaceOnUse" x1={PAD_L} x2={PAD_L + iw} y1={0} y2={0}>
                {stops('fill')}
              </linearGradient>
              <linearGradient id={`${uid}i`} gradientUnits="userSpaceOnUse" x1={PAD_L} x2={PAD_L + iw} y1={0} y2={0}>
                {stops('ink')}
              </linearGradient>
              <linearGradient id={`${uid}v`} x1="0" x2="0" y1="0" y2="1" gradientUnits="userSpaceOnUse">
                <stop offset={padT / height} stopColor="#fff" stopOpacity={0.55} />
                <stop offset={(padT + ih) / height} stopColor="#fff" stopOpacity={0.04} />
              </linearGradient>
              <mask id={`${uid}m`} maskUnits="userSpaceOnUse">
                <rect x={0} y={0} width={width} height={height} fill={`url(#${uid}v)`} />
              </mask>
              <clipPath id={`${uid}c`}>
                <motion.rect x={0} y={-40} height={height + 80} width={width + 20} {...lineReveal} />
              </clipPath>
            </defs>

            {/* 1. Best-window column */}
            <AnimatePresence>
              {win && hasForecast && (
                <motion.g
                  key={`${win.start.getTime()}-${win.end.getTime()}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  data-testid="chart-window"
                  data-start={win.start.toISOString()}
                  data-end={win.end.toISOString()}
                >
                  <rect x={winXa} y={padT - 6} width={Math.max(0, winXb - winXa)} height={ih + 6} rx={8} style={{ fill: 'hsl(var(--primary) / 0.09)' }} />
                  {[winXa, winXb].map((x, i) => (
                    <line key={i} x1={x} x2={x} y1={padT - 6} y2={padT + ih} strokeDasharray="3 3" style={{ stroke: 'hsl(var(--primary) / 0.35)' }} />
                  ))}
                </motion.g>
              )}
            </AnimatePresence>

            {/* Deadline overlay */}
            {deadlineX !== null && (
              <g data-testid="chart-deadline">
                <rect x={deadlineX} y={padT} width={PAD_L + iw - deadlineX} height={ih} style={{ fill: 'hsl(205 20% 50% / 0.10)' }} />
                <line x1={deadlineX} x2={deadlineX} y1={padT - 4} y2={padT + ih} strokeWidth={1.4} strokeDasharray="4 3" style={{ stroke: 'hsl(var(--foreground) / 0.6)' }} />
                {deadlineLabel && (
                  <text x={Math.min(deadlineX - 4, PAD_L + iw)} y={padT + 10} textAnchor="end" fontSize={10.5} fontWeight={700} style={{ fill: 'hsl(var(--muted-foreground))' }}>
                    {deadlineLabel}
                  </text>
                )}
              </g>
            )}

            {/* 2. Gridlines (true min / max) and baseline */}
            {hasForecast &&
              labels.map((l) => (
                <g key={l.text} data-testid="chart-axis-label" data-value={l.text}>
                  <line x1={PAD_L} x2={PAD_L + iw} y1={l.y} y2={l.y} strokeDasharray="2 4" style={{ stroke: 'hsl(var(--chart-grid) / 0.28)' }} />
                  <text x={width - PAD_R + 8} y={l.labelY} dominantBaseline="central" fontSize={11.5} fontWeight={700} className="tabular-nums" style={{ fill: 'hsl(var(--muted-foreground))' }}>
                    {l.text}
                  </text>
                </g>
              ))}
            <line x1={PAD_L} x2={PAD_L + iw} y1={padT + ih} y2={padT + ih} style={{ stroke: 'hsl(var(--chart-grid) / 0.35)' }} />

            {/* x ticks */}
            {tickList.map((tk) => {
              const x = X(tk.t);
              if (x < PAD_L + 8 || x > PAD_L + iw - 6) return null;
              return (
                <g key={tk.t}>
                  <line x1={x} x2={x} y1={padT + ih} y2={padT + ih + 4} style={{ stroke: 'hsl(var(--chart-grid) / 0.6)' }} />
                  <text x={x} y={padT + ih + 17} textAnchor="middle" fontSize={ticks === 'six' ? 11.5 : 11} fontWeight={600} style={{ fill: 'hsl(var(--muted-foreground))' }}>
                    {tk.label}
                  </text>
                </g>
              );
            })}

            {/* 3 + 4. Area and lines (revealed left to right on first draw) */}
            <g clipPath={`url(#${uid}c)`}>
              {areaPaths.map((d, i) => (
                <motion.path
                  key={`a${i}`}
                  d={d}
                  fill={`url(#${uid}f)`}
                  mask={`url(#${uid}m)`}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.15 }}
                />
              ))}
              {forecastPaths.map((d, i) =>
                forecastStyle === 'band' ? (
                  <path key={`f${i}`} d={d} fill="none" stroke={`url(#${uid}i)`} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" data-testid="chart-forecast-line" />
                ) : (
                  <path key={`f${i}`} d={d} fill="none" strokeWidth={2.2} strokeDasharray="5 4" strokeLinecap="round" style={{ stroke: 'hsl(var(--series-forecast))' }} data-testid="chart-forecast-line" />
                ),
              )}
              {actualPaths.map((d, i) => (
                <path key={`ac${i}`} d={d} fill="none" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'hsl(var(--series-actual))' }} data-testid="chart-actual-line" />
              ))}
              {estimatePaths.map((d, i) => (
                <path key={`e${i}`} d={d} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'hsl(var(--series-estimate))' }} data-testid="chart-estimate-line" />
              ))}
            </g>

            {/* 5. Dirtiest / highest marker */}
            {dirtiest && dirtiest.forecast !== null && (() => {
              const x = X(mid(dirtiest));
              const y = Y(dirtiest.forecast);
              const chip = placed.find((c) => c.id === 'dirty');
              const top = chip ? chipTop(chip.lane, 'dirty') : padT - 26;
              return (
                <g data-testid="chart-dirtiest">
                  <line x1={x} x2={x} y1={top + 19} y2={y - 6} strokeDasharray="2 2" style={{ stroke: bandInk(dirtiest.index), strokeOpacity: 0.45 }} />
                  <circle cx={x} cy={y} r={5} stroke="#fff" strokeWidth={2} style={{ fill: bandFill(dirtiest.index) }} />
                  {chip && (
                    <g>
                      <rect x={chip.left} y={top} width={chip.width} height={19} rx={9.5} fill="#fff" style={{ stroke: bandInk(dirtiest.index), strokeOpacity: 0.4 }} />
                      <text x={chip.left + chip.width / 2} y={top + 13} textAnchor="middle" fontSize={10.5} fontWeight={800} style={{ fill: bandInk(dirtiest.index) }}>
                        {extremeLabel?.(dirtiest)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

            {/* 6. Now marker */}
            {nowPoint && nowMs !== null && nowPoint.forecast !== null && (() => {
              const x = X(nowMs);
              const y = Y(nowPoint.forecast);
              const chip = placed.find((c) => c.id === 'now');
              const pillY = mode === 'day' ? (chip ? chipTop(chip.lane, 'now') + 2 : padT - 24) : y > padT + ih / 2 ? padT + 2 : padT + ih - 18;
              const pillX = Math.min(x + 5, PAD_L + iw - 32);
              return (
                <g data-testid="chart-now" data-band={nowPoint.index ?? ''}>
                  <line x1={x} x2={x} y1={padT - 4} y2={padT + ih} strokeWidth={1.2} style={{ stroke: 'hsl(var(--foreground) / 0.55)' }} />
                  <circle cx={x} cy={y} r={6.5} stroke="#fff" strokeWidth={2.5} style={{ fill: bandFill(nowPoint.index) }} data-testid="chart-now-dot" />
                  <rect x={pillX} y={pillY} width={32} height={16} rx={8} style={{ fill: 'hsl(var(--foreground))' }} />
                  <text x={pillX + 16} y={pillY + 11.5} textAnchor="middle" fontSize={10} fontWeight={800} style={{ fill: 'hsl(var(--background))' }}>
                    Now
                  </text>
                </g>
              );
            })()}

            {/* 7. Best-window chip */}
            <AnimatePresence>
              {win && windowLabel && hasForecast && scrub === null && (() => {
                if (mode === 'day') {
                  const w = chipWidth(windowLabel);
                  const left = Math.max(PAD_L, Math.min((winXa + winXb) / 2 - w / 2, width - w - 2));
                  return (
                    <motion.g key="daychip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} data-testid="chart-window-chip">
                      <rect x={left} y={padT + ih - 26} width={w} height={20} rx={10} style={{ fill: 'hsl(var(--primary))' }} />
                      <text x={left + w / 2} y={padT + ih - 12} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">{windowLabel}</text>
                    </motion.g>
                  );
                }
                const chip = placed.find((c) => c.id === 'win');
                if (!chip) return null;
                const top = chipTop(chip.lane, 'win');
                return (
                  <motion.g key="chip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} data-testid="chart-window-chip">
                    <rect x={chip.left} y={top} width={chip.width} height={20} rx={10} style={{ fill: 'hsl(var(--primary))' }} />
                    <text x={chip.left + chip.width / 2} y={top + 14} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">{windowLabel}</text>
                  </motion.g>
                );
              })()}
            </AnimatePresence>

            {/* Flat / zero note */}
            {flatNote && hasForecast && (
              <g data-testid="chart-flat-note">
                <rect x={PAD_L + iw / 2 - (flatNote.length * 6.6 + 20) / 2} y={padT + ih * 0.3 - 15} width={flatNote.length * 6.6 + 20} height={22} rx={11} style={{ fill: 'hsl(var(--card))', stroke: 'hsl(var(--border))' }} />
                <text x={PAD_L + iw / 2} y={padT + ih * 0.3} textAnchor="middle" fontSize={12.5} fontWeight={700} style={{ fill: 'hsl(var(--muted-foreground))' }}>
                  {flatNote}
                </text>
              </g>
            )}

            {/* 8. Scrub crosshair */}
            {sp && sp.forecast !== null && (
              <g data-testid="chart-scrub">
                <line x1={spX} x2={spX} y1={padT - 8} y2={padT + ih} strokeWidth={1.5} style={{ stroke: 'hsl(var(--foreground))' }} />
                <circle cx={spX} cy={spY} r={7} fill="#fff" strokeWidth={3} style={{ stroke: bandInk(sp.index) }} />
              </g>
            )}
          </svg>
        )}

        {!hasForecast && width > 0 && (
          <div className="absolute inset-x-0 flex flex-col items-center justify-center text-center" style={{ top: padT, height: ih }} data-testid="chart-empty">
            <p className="text-[12px] font-semibold text-muted-foreground">{emptyTitle}</p>
            {emptyDetail && <p className="text-[12px] text-muted-foreground">{emptyDetail}</p>}
          </div>
        )}

        {/* Tooltip: always inside the chart box (flip below at the top, clamp at the sides). */}
        <AnimatePresence>
          {sp && tip && tooltipVisible && sp.forecast !== null && (
            <motion.div
              key="tip"
              data-testid="chart-tooltip"
              aria-hidden="true"
              className="pointer-events-none absolute z-20 rounded-[12px] px-3 py-2 text-white"
              style={{ left: tip.left, top: tip.top, width: tipW, height: tipH, background: '#1d2733', boxShadow: '0 6px 10px rgba(20,30,40,.18)' }}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.12, ease: 'easeOut' }}
            >
              <p className="text-[11px] font-bold leading-[16px] tabular-nums" style={{ color: '#c9d3dc' }}>
                {sp.time ? sp.time : `${formatLondonTime(new Date(sp.from))}\u2013${formatLondonTime(new Date(sp.to))}`}
              </p>
              <p className="text-[14px] font-extrabold leading-[18px] tabular-nums">{sp.forecast} {UNIT}</p>
              <p className="flex items-center gap-1.5 text-[11px] font-bold leading-[16px]">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: bandFill(sp.index) }} />
                {bandName(sp.index)}
              </p>
              {extraLine && <p className="text-[11px] font-bold leading-[16px] tabular-nums" style={{ color: '#c9d3dc' }}>{extraLine}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrub surface: a slider for AT, pointer drag/hover for everyone else. */}
        {hasForecast && (
          <div
            role="slider"
            tabIndex={0}
            aria-label={`${ariaLabel}: scrub half hours`}
            aria-valuemin={0}
            aria-valuemax={Math.max(0, visible.length - 1)}
            aria-valuenow={readIndex ?? 0}
            aria-valuetext={valueText}
            className="absolute inset-0 touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{ cursor: 'crosshair' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={(e) => e.pointerType === 'mouse' && release(e)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              setTooltipVisible(false);
              setIndex(null);
            }}
            data-testid="chart-slider"
          />
        )}
      </div>

      {/* sr-only table (time, forecast, band, actual or est) */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Forecast ({UNIT})</th>
            <th scope="col">Band</th>
            {showActual && <th scope="col">Actual</th>}
            {showEstimate && <th scope="col">Est</th>}
          </tr>
        </thead>
        <tbody>
          {visible.map((p) => (
            <tr key={p.from}>
              <td>{p.time ?? formatLondonTime(new Date(p.from))}</td>
              <td>{p.forecast ?? 'No data'}</td>
              <td>{p.forecast !== null ? bandName(p.index) : ''}</td>
              {showActual && <td>{p.actual ?? 'No data'}</td>}
              {showEstimate && <td>{p.estimate ?? 'No data'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Convert API rows to chart points for a time range (missing half hours become null gaps). */
export function toChartPoints(
  items: ForecastData[],
  t0: number,
  t1: number,
  opts: { includeActual: boolean; includeEstimate: boolean; now?: number },
): ChartPoint[] {
  const SLOT = 30 * 60_000;
  const byStart = new Map<number, ForecastData>();
  for (const it of items) {
    const f = Date.parse(it.from);
    if (Number.isFinite(f) && !byStart.has(f)) byStart.set(f, it);
  }
  const out: ChartPoint[] = [];
  const start = Math.floor(t0 / SLOT) * SLOT;
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  for (let t = start; t < t1; t += SLOT) {
    const it = byStart.get(t);
    const a = it?.intensity?.actual;
    const est = !!it?.intensity?.actualEstimated;
    out.push({
      from: t,
      to: t + SLOT,
      forecast: ok(it?.intensity?.forecast) ? (it!.intensity.forecast as number) : null,
      actual: opts.includeActual && ok(a) && !est ? a : null,
      estimate: opts.includeEstimate && ok(a) && est ? a : null,
      index: it?.intensity?.index ?? null,
    });
  }
  return out;
}

export { formatWindow };

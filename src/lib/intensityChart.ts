/**
 * Pure geometry for IntensityLineChart (spec §3). Kept out of the component so
 * the rules the acceptance checklist cares about (no overshoot, true min/max
 * labels, label merging, tooltip placement, DST-aware ticks) are unit tested.
 */
import { formatLondonTime, londonDateKey, LONDON_TZ } from '@/lib/londonTime';
import { SLOT_MS, londonWallTimeToInstant } from '@/lib/dayForecast';

export interface XY {
  x: number;
  y: number;
}

/**
 * Monotone cubic (Fritsch–Carlson, the same maths as d3/recharts `monotoneX`).
 * Between two points the curve stays inside their y range, so the stroke can
 * never dip below the plotted min or rise above the plotted max.
 */
export function monotonePath(pts: XY[]): string {
  const n = pts.length;
  if (n === 0) return '';
  const f = (v: number) => (Math.round(v * 100) / 100).toString();
  if (n === 1) return `M${f(pts[0].x)},${f(pts[0].y)}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = dx[i] === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx[i];
  }
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${f(pts[i].x + h)},${f(pts[i].y + t[i] * h)} ${f(pts[i + 1].x - h)},${f(pts[i + 1].y - t[i + 1] * h)} ${f(pts[i + 1].x)},${f(pts[i + 1].y)}`;
  }
  return d;
}

/** Split a series into runs of consecutive non-null values (nulls are gaps, never 0). */
export function runs<T>(items: T[], value: (item: T) => number | null): T[][] {
  const out: T[][] = [];
  let cur: T[] = [];
  for (const it of items) {
    if (value(it) === null) {
      if (cur.length) out.push(cur);
      cur = [];
    } else cur.push(it);
  }
  if (cur.length) out.push(cur);
  return out;
}

export interface AxisLabel {
  /** Gridline y (px). */
  y: number;
  /** Label y (px, vertical centre). */
  labelY: number;
  text: string;
}

/**
 * Right-axis labels: only the true plotted min and max. One label when they're
 * equal; a single "min–max" label on the min gridline when the two gridlines
 * would be under 22 px apart.
 */
export function axisLabels(min: number | null, max: number | null, toY: (v: number) => number): AxisLabel[] {
  if (min === null || max === null) return [];
  const lo = Math.round(min);
  const hi = Math.round(max);
  if (lo === hi) return [{ y: toY(min), labelY: toY(min), text: `${lo}` }];
  const yLo = toY(min);
  const yHi = toY(max);
  if (Math.abs(yLo - yHi) < 22) return [{ y: yLo, labelY: (yLo + yHi) / 2, text: `${lo}\u2013${hi}` }];
  return [
    { y: yHi, labelY: yHi, text: `${hi}` },
    { y: yLo, labelY: yLo, text: `${lo}` },
  ];
}

/**
 * Tooltip position (spec §3.5): above the point; flip below if that would come
 * within 2 px of the top; then clamp inside the chart box on both axes.
 */
export function placeTooltip(o: {
  x: number;
  y: number;
  w: number;
  h: number;
  chartW: number;
  chartH: number;
}): { left: number; top: number; flipped: boolean } {
  let top = o.y - o.h - 14;
  let flipped = false;
  if (top < 2) {
    top = o.y + 14;
    flipped = true;
  }
  top = Math.max(2, Math.min(top, o.chartH - o.h - 2));
  const left = Math.max(2, Math.min(o.x - o.w / 2, o.chartW - o.w - 2));
  return { left, top, flipped };
}

const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON_TZ, hour: 'numeric', hourCycle: 'h23' });
const minuteFmt = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON_TZ, minute: 'numeric' });
const weekdayShort = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON_TZ, weekday: 'short' });
const dayMonthShort = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON_TZ, day: 'numeric', month: 'short' });

export interface Tick {
  t: number;
  label: string;
  /** Draw a faint full-height divider (day boundaries in week/month view). */
  divider?: boolean;
}

/** London 00/06/12/18 ticks inside [t0, t1], DST-aware (on the hour in London). */
export function sixHourTicks(t0: number, t1: number): Tick[] {
  const out: Tick[] = [];
  for (let t = Math.ceil(t0 / SLOT_MS) * SLOT_MS; t <= t1; t += SLOT_MS) {
    if (Number(minuteFmt.format(t)) !== 0) continue;
    if (Number(hourFmt.format(t)) % 6 !== 0) continue;
    out.push({ t, label: formatLondonTime(new Date(t)) });
  }
  return out;
}

/** One label per London day at noon ("Mon"); month view labels every 7th day ("5 Oct"). */
export function dayTicks(t0: number, t1: number, mode: 'week' | 'month'): Tick[] {
  const out: Tick[] = [];
  let key = londonDateKey(new Date(t0));
  for (let i = 0; i < 40; i++) {
    const midnight = londonWallTimeToInstant(key, 0);
    const noon = londonWallTimeToInstant(key, 12);
    if (midnight > t1) break;
    if (noon >= t0 && noon <= t1) {
      if (mode === 'week') out.push({ t: noon, label: weekdayShort.format(noon), divider: true });
      else if (i % 7 === 0) out.push({ t: noon, label: dayMonthShort.format(noon) });
    }
    const [y, m, d] = key.split('-').map(Number);
    key = londonDateKey(new Date(Date.UTC(y, m - 1, d + 1, 12)));
  }
  return out;
}

/** Chip width estimate for layoutChips (11 px bold font). */
export function chipWidth(text: string, perChar = 6.3, pad = 18): number {
  return Math.ceil(text.length * perChar + pad);
}

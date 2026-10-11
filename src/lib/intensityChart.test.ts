import { describe, expect, it } from 'vitest';
import { axisLabels, dayTicks, monotonePath, placeTooltip, runs, sixHourTicks } from './intensityChart';
import { londonDayBounds, londonWallTimeToInstant, yDomain, buildDayDetail, layoutChips } from './dayForecast';
import { formatLondonTime } from './londonTime';
import type { ForecastData } from './carbonApi';
import nov6 from '@/test/fixtures/neso-regional-south-scotland-2025-11-06.json';

/** Sample a path's cubic segments densely and return the y extent. */
function pathYExtent(d: string): [number, number] {
  const nums = d.replace(/[MC]/g, ' ').trim().split(/[\s,]+/).map(Number);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i + 3 < pts.length; i += 3) {
    const [p0, p1, p2, p3] = [pts[i], pts[i + 1], pts[i + 2], pts[i + 3]];
    for (let k = 0; k <= 50; k++) {
      const t = k / 50;
      const y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t * t * p2[1] + t ** 3 * p3[1];
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  }
  return [lo, hi];
}

describe('yDomain (spec §3.2)', () => {
  it('flat 0 sits on the baseline of a 0–50 axis', () => {
    expect(yDomain(0, 0)).toEqual([0, 50]);
  });
  it('small spreads get a 50 g window centred on the data', () => {
    expect(yDomain(100, 120)).toEqual([85, 135]);
  });
  it('wide spreads get 12% padding, floored at 0', () => {
    const [a, b] = yDomain(4, 146);
    expect(a).toBe(0);
    expect(b).toBeCloseTo(146 + 142 * 0.12);
  });
  it('no data falls back to 0–50', () => expect(yDomain(null, null)).toEqual([0, 50]));
});

describe('monotonePath', () => {
  it('never overshoots the plotted min or max (no dip below the min gridline)', () => {
    const values = [140, 146, 92, 92, 130, 100, 146, 95];
    const Y = (v: number) => 200 - v;
    const d = monotonePath(values.map((v, i) => ({ x: i * 10, y: Y(v) })));
    const [top, bottom] = pathYExtent(d);
    expect(bottom).toBeLessThanOrEqual(Y(92) + 1e-6);
    expect(top).toBeGreaterThanOrEqual(Y(146) - 1e-6);
  });

  it('6 Nov 2025 South Scotland: the lowest stroke point equals the min gridline', () => {
    const items = (nov6 as { data: { data: ForecastData[] } }).data.data;
    const detail = buildDayDetail(items, '2025-11-06', { includeActual: false, includeEstimate: false, now: new Date('2025-11-06T09:10:00Z') });
    const [y0, y1] = yDomain(detail.min, detail.max);
    const Y = (v: number) => 38 + 134 - ((v - y0) / (y1 - y0)) * 134;
    const pts = detail.slots.filter((s) => s.forecast !== null).map((s, i) => ({ x: i * 7, y: Y(s.forecast as number) }));
    const [, bottom] = pathYExtent(monotonePath(pts));
    expect(Math.abs(bottom - Y(detail.min as number))).toBeLessThan(0.01); // path coords are rounded to 0.01 px
  });
});

describe('runs', () => {
  it('breaks lines at nulls and never fills them with 0', () => {
    const r = runs([1, 2, null, 4, null, null, 7], (v) => v);
    expect(r).toEqual([[1, 2], [4], [7]]);
  });
});

describe('axisLabels', () => {
  const Y = (v: number) => 200 - v * 2;
  it('labels exactly the plotted min and max', () => {
    expect(axisLabels(92, 146, Y).map((l) => l.text)).toEqual(['146', '92']);
  });
  it('one label when min === max', () => {
    expect(axisLabels(0, 0, Y).map((l) => l.text)).toEqual(['0']);
  });
  it('merges into "min–max" on the min gridline when under 22 px apart', () => {
    const labels = axisLabels(0, 2, Y);
    expect(labels).toHaveLength(1);
    expect(labels[0].text).toBe('0\u20132');
    expect(labels[0].y).toBe(Y(0));
  });
});

describe('placeTooltip (spec §3.5)', () => {
  const base = { w: 128, h: 58, chartW: 326, chartH: 196 };
  it('sits above the point by default', () => {
    expect(placeTooltip({ ...base, x: 160, y: 150 })).toMatchObject({ top: 150 - 58 - 14, flipped: false });
  });
  it('flips below when it would hit the top', () => {
    const t = placeTooltip({ ...base, x: 160, y: 40 });
    expect(t.flipped).toBe(true);
    expect(t.top).toBe(54);
  });
  it('clamps left and right inside the chart', () => {
    expect(placeTooltip({ ...base, x: 4, y: 150 }).left).toBe(2);
    expect(placeTooltip({ ...base, x: 324, y: 150 }).left).toBe(326 - 128 - 2);
  });
  it('never extends outside the container vertically', () => {
    const t = placeTooltip({ ...base, x: 100, y: 190 });
    expect(t.top + 58).toBeLessThanOrEqual(196 - 2);
    expect(t.top).toBeGreaterThanOrEqual(2);
  });
});

describe('ticks', () => {
  it('25 Oct 2026 (clocks go back) has 50 half hours and 00/06/12/18 wall-clock ticks', () => {
    const b = londonDayBounds('2026-10-25');
    expect(b.slotCount).toBe(50);
    const ticks = sixHourTicks(b.start, b.end - 1);
    expect(ticks.map((t) => t.label)).toEqual(['00:00', '06:00', '12:00', '18:00']);
    expect(ticks[1].t).toBe(londonWallTimeToInstant('2026-10-25', 6));
    const detail = buildDayDetail([], '2026-10-25', { includeActual: true });
    expect(detail.slots).toHaveLength(50);
    expect(detail.slots[2].time).toBe(formatLondonTime(new Date(b.start + 2 * 30 * 60_000)));
  });
  it('29 Mar 2026 (clocks go forward) has 46 half hours', () => {
    expect(londonDayBounds('2026-03-29').slotCount).toBe(46);
  });
  it('week ticks label each London day at noon', () => {
    const t0 = londonWallTimeToInstant('2026-10-04', 12);
    const t1 = londonWallTimeToInstant('2026-10-11', 12);
    const t = dayTicks(t0, t1, 'week');
    expect(t[0].label).toBe('Sun');
    expect(t).toHaveLength(8);
  });
});

describe('layoutChips', () => {
  it('stacks overlapping chips into a second lane', () => {
    const placed = layoutChips([{ id: 'a', x: 100, width: 80 }, { id: 'b', x: 120, width: 80 }], 300);
    expect(placed.map((p) => p.lane)).toEqual([0, 1]);
  });
});

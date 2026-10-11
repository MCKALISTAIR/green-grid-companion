import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ForecastData } from '@/lib/carbonApi';
import { getRegionalHistoryAndForecast, getIntensityRange } from '@/lib/carbonApi';
import {
  buildDayDetail,
  defaultIndex,
  getDailyStats,
  layoutChips,
  londonDayBounds,
  londonDayTicks,
  summariseDay,
  slotValueText,
  SLOT_MS,
} from '@/lib/dayForecast';
import { findCleanestWindow, planLoad } from '@/lib/nowOrWait';
import { formatLondonTime } from '@/lib/londonTime';
import southScotland from '@/test/fixtures/neso-regional-south-scotland-2026-10-11.json';
import london from '@/test/fixtures/neso-regional-london-fw48h-2026-10-11.json';
import national from '@/test/fixtures/neso-national-2026-10-11.json';

afterEach(() => vi.restoreAllMocks());

const SS = southScotland.data.data as unknown as ForecastData[];
const LDN = london.data.data as unknown as ForecastData[];
const GB = national.data as unknown as ForecastData[];
const NOW = new Date('2026-10-11T10:10:00Z'); // 11:10 BST, Sunday

function slot(from: string, forecast: number | null, extra: Partial<ForecastData['intensity']> = {}): ForecastData {
  const to = new Date(Date.parse(from) + SLOT_MS).toISOString();
  return {
    from,
    to,
    intensity: { forecast: forecast as number, index: 'moderate', ...extra },
  };
}

/** A synthetic day of half-hours from a London day's bounds. */
function syntheticDay(dateKey: string, value: (i: number) => number | null): ForecastData[] {
  const { start, slotCount } = londonDayBounds(dateKey);
  return Array.from({ length: slotCount }, (_, i) => slot(new Date(start + i * SLOT_MS).toISOString(), value(i)));
}

describe('getDailyStats (48-hour overview cards)', () => {
  it('keeps NESO\'s published zeros for South Scotland as real zeros, and flags the day', () => {
    // Live API, 11 Oct 2026: every South Scotland half-hour is forecast 0 (wind + nuclear).
    expect(SS.every((r) => r.intensity.forecast === 0)).toBe(true);
    const days = getDailyStats(SS, NOW);
    expect(days.map((d) => d.label)).toEqual(['Today', 'Tomorrow']);
    expect(days[0]).toMatchObject({ date: '2026-10-11', min: 0, avg: 0, max: 0, allZero: true });
  });

  it('computes real ranges for a non-zero region (London fw48h fixture)', () => {
    const days = getDailyStats(LDN, NOW);
    const today = days.find((d) => d.date === '2026-10-11')!;
    const values = LDN.filter((r) => r.from >= '2026-10-10T23:00Z' && r.from < '2026-10-11T23:00Z').map(
      (r) => r.intensity.forecast,
    );
    expect(today.min).toBe(Math.min(...values));
    expect(today.max).toBe(Math.max(...values));
    expect(today.min).toBeGreaterThan(0);
    expect(today.allZero).toBe(false);
  });

  it('matches the GB-wide range other apps show (40s to 209 today)', () => {
    const today = getDailyStats(GB, NOW).find((d) => d.date === '2026-10-11')!;
    expect(today.max).toBe(209);
    expect(today.min).toBeLessThan(60);
  });

  it('never turns missing values into 0', () => {
    const days = getDailyStats(
      [
        slot('2026-10-12T10:00:00Z', null),
        { from: '2026-10-12T10:30:00Z', to: '2026-10-12T11:00:00Z', intensity: {} as ForecastData['intensity'] },
      ],
      NOW,
    );
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ min: null, avg: null, max: null, allZero: false });
  });

  it('buckets by the Europe/London day, not UTC or the device zone', () => {
    // 23:30Z on 11 Oct is 00:30 BST on Monday 12 Oct.
    const days = getDailyStats([slot('2026-10-11T22:30:00Z', 100), slot('2026-10-11T23:30:00Z', 50)], NOW);
    expect(days.map((d) => [d.date, d.avg])).toEqual([
      ['2026-10-11', 100],
      ['2026-10-12', 50],
    ]);
  });

  it('only shows past-day actuals, flagged as GridSense estimates when backfilled', () => {
    const days = getDailyStats(
      [
        slot('2026-10-10T12:00:00Z', 80, { actual: 0, actualEstimated: true }),
        slot('2026-10-11T12:00:00Z', 90, { actual: 95 }),
      ],
      NOW,
    );
    expect(days[0]).toMatchObject({ label: 'Saturday', hasActuals: true, actualsEstimated: true, avgActual: 0 });
    expect(days[1]).toMatchObject({ label: 'Today', hasActuals: false, avgActual: null });
  });
});

describe('regional backfill', () => {
  const mockFetch = (rows: unknown[]) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { regionid: 2, shortname: 'South Scotland', data: rows } }), { status: 200 }),
    );

  it('does not invent a 0 "actual" when the generation mix is empty or missing', async () => {
    mockFetch([
      { from: 'a', to: 'b', intensity: { forecast: 120, index: 'moderate' }, generationmix: [] },
      { from: 'b', to: 'c', intensity: { forecast: 120, index: 'moderate' } },
    ]);
    const rows = await getRegionalHistoryAndForecast(2, 'x', 'y');
    expect(rows[0].intensity.actual ?? null).toBeNull();
    expect(rows[1].intensity.actual ?? null).toBeNull();
  });

  it('a real wind + nuclear mix is a genuine 0 estimate', async () => {
    mockFetch([SS[0]]);
    const rows = await getRegionalHistoryAndForecast(2, 'x', 'y');
    expect(rows[0].intensity.actual).toBe(0);
    expect(rows[0].intensity.actualEstimated).toBe(true);
  });

  it('getIntensityRange returns regional rows with no actuals at all', async () => {
    mockFetch([{ ...SS[0], intensity: { ...SS[0].intensity, actual: 42 } }]);
    const rows = await getIntensityRange(2, 'x', 'y');
    expect(rows[0].intensity.actual).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.carbonintensity.org.uk/regional/intensity/x/y/regionid/2',
      expect.anything(),
    );
  });
});

describe('London day layout and DST', () => {
  it('a normal day has 48 half-hours', () => {
    expect(londonDayBounds('2026-10-11').slotCount).toBe(48);
    expect(new Date(londonDayBounds('2026-10-11').start).toISOString()).toBe('2026-10-10T23:00:00.000Z');
  });

  it('Sun 25 Oct 2026 (clocks go back) has 50 half-hours, with 01:00 twice', () => {
    const b = londonDayBounds('2026-10-25');
    expect(b.slotCount).toBe(50);
    const detail = buildDayDetail(syntheticDay('2026-10-25', (i) => 100 + i), '2026-10-25', {
      includeActual: false,
      now: new Date('2026-10-25T01:15:00Z'), // 01:15 GMT, the second 01:xx
    });
    expect(detail.slots).toHaveLength(50);
    expect(detail.slots.filter((s) => s.time === '01:00')).toHaveLength(2);
    expect(detail.nowIndex).toBe(4);
    expect(detail.slots[4].time).toBe('01:00');
    expect(detail.internalGaps).toBe(0);
  });

  it('Sun 29 Mar 2026 (clocks go forward) has 46 half-hours and skips 01:00', () => {
    const b = londonDayBounds('2026-03-29');
    expect(b.slotCount).toBe(46);
    const detail = buildDayDetail(syntheticDay('2026-03-29', () => 100), '2026-03-29', {
      includeActual: false,
      now: new Date('2026-03-29T12:00:00Z'), // 13:00 BST
    });
    expect(detail.slots.map((s) => s.time).slice(0, 4)).toEqual(['00:00', '00:30', '02:00', '02:30']);
    expect(detail.slots[detail.nowIndex!].time).toBe('13:00');
  });

  it.each(['2026-10-25', '2026-03-29', '2026-10-11'])('ticks land on 00, 06, 12, 18 London time on %s', (key) => {
    const ticks = londonDayTicks(key);
    expect(ticks.map((t) => formatLondonTime(new Date(t)))).toEqual(['00:00', '06:00', '12:00', '18:00']);
    const { start, end } = londonDayBounds(key);
    expect(ticks[0]).toBe(start);
    ticks.forEach((t) => expect(t).toBeLessThan(end));
  });

  it('the Now marker is the real instant, so it does not drift on DST days', () => {
    const now = new Date('2026-10-25T17:40:00Z'); // 17:40 GMT
    const detail = buildDayDetail(syntheticDay('2026-10-25', () => 100), '2026-10-25', { includeActual: false, now });
    expect(detail.slots[detail.nowIndex!].time).toBe('17:30');
  });
});

describe('buildDayDetail', () => {
  it('keeps missing half-hours as gaps (null), never interpolated', () => {
    const items = syntheticDay('2026-10-12', (i) => (i >= 10 && i < 14 ? null : 100 + i));
    const detail = buildDayDetail(items, '2026-10-12', { includeActual: false, now: NOW });
    expect(detail.slots[11].forecast).toBeNull();
    expect(detail.internalGaps).toBe(4);
    expect(detail.missingAfterHorizon).toBe(0);
  });

  it('treats the missing tail of a future day as beyond the forecast horizon', () => {
    const items = syntheticDay('2026-10-13', (i) => (i < 20 ? 100 + i : null)).filter((r) => r.intensity.forecast !== null);
    const detail = buildDayDetail(items, '2026-10-13', { includeActual: false, now: NOW });
    expect(detail.internalGaps).toBe(0);
    expect(detail.missingAfterHorizon).toBe(28);
  });

  it('never draws a regional actual, even a backfilled one', () => {
    const items = SS.map((r) => ({ ...r, intensity: { ...r.intensity, actual: 0, actualEstimated: true } }));
    const detail = buildDayDetail(items, '2026-10-11', { includeActual: false, now: NOW });
    expect(detail.hasActualLine).toBe(false);
    expect(detail.slots.every((s) => s.actual === null)).toBe(true);
    expect(detail.allZero).toBe(true);
    expect(detail.showExtremes).toBe(false);
    expect(detail.cleanest).toBeNull();
  });

  it('draws GB actuals from NESO, and the SS fixture has a real 0 every half hour', () => {
    const detail = buildDayDetail(GB, '2026-10-11', { includeActual: true, now: NOW });
    expect(detail.hasActualLine).toBe(true);
    expect(detail.slots).toHaveLength(48);
    expect(detail.max).toBe(209);
    expect(detail.dirtiest?.time).toBe('20:00'); // 19:00Z = 20:00 BST
    expect(detail.nowIndex).toBe(22); // 11:00 BST slot
  });

  it('picks the cleanest window with the same logic as the Now-or-wait card', () => {
    const key = '2026-10-12';
    const values = (i: number) => 200 - Math.round(80 * Math.sin((i / 47) * Math.PI)) + (i === 30 ? -50 : 0);
    const items = syntheticDay(key, values);
    const detail = buildDayDetail(items, key, { includeActual: false, now: NOW });
    const { start, end } = londonDayBounds(key);
    const direct = findCleanestWindow(items, { fromMs: start, toMs: end });
    expect(detail.cleanest).toEqual(direct);
    // planLoad from the first half hour with the whole day as horizon agrees too.
    const plan = planLoad({ forecast: items, now: new Date(start + 60_000), horizonHours: null });
    expect(plan.best?.start.getTime()).toBe(direct!.start.getTime());
    expect(direct!.end.getTime() - direct!.start.getTime()).toBe(3 * 3600_000);
  });

  it('summary uses an en dash and no em dash', () => {
    const items = syntheticDay('2026-10-12', (i) => 100 + Math.abs(24 - i) * 5);
    const detail = buildDayDetail(items, '2026-10-12', { includeActual: false, now: NOW });
    const text = summariseDay(detail);
    expect(text).toMatch(/^Forecast from 100 to 220 gCO₂\/kWh, cleanest \d\d:\d\d\u2013\d\d:\d\d, dirtiest 00:00\.$/);
    expect(text).not.toMatch(/\u2014/);
  });

  it('default readout is now for today and the cleanest half hour otherwise', () => {
    const today = buildDayDetail(GB, '2026-10-11', { includeActual: true, now: NOW });
    expect(defaultIndex(today)).toBe(22);
    const items = syntheticDay('2026-10-12', (i) => (i === 27 ? 10 : 100));
    const tomorrow = buildDayDetail(items, '2026-10-12', { includeActual: false, now: NOW });
    expect(tomorrow.slots[defaultIndex(tomorrow)!].time).toBe('13:30');
  });

  it('slider value text reads time, forecast and actual', () => {
    const detail = buildDayDetail(GB, '2026-10-11', { includeActual: true, now: NOW });
    expect(slotValueText(detail, 0)).toBe('00:00, forecast 45 gCO₂/kWh, actual 63');
    expect(slotValueText(detail, 40)).toMatch(/^20:00, forecast 209 gCO₂\/kWh$/);
  });
});

describe('layoutChips', () => {
  it('stacks overlapping chips into lanes and clamps them inside the chart', () => {
    const placed = layoutChips(
      [
        { id: 'clean', x: 100, width: 120 },
        { id: 'now', x: 130, width: 40 },
        { id: 'dirty', x: 340, width: 90 },
      ],
      360,
    );
    const byId = Object.fromEntries(placed.map((p) => [p.id, p]));
    expect(byId.clean.lane).not.toBe(byId.now.lane);
    expect(byId.dirty.left + byId.dirty.width).toBeLessThanOrEqual(360);
    expect(byId.dirty.lane).toBe(0);
  });
});

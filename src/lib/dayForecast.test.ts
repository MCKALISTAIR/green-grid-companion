import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ForecastData } from '@/lib/carbonApi';
import { getRegionalHistoryAndForecast } from '@/lib/carbonApi';
import {
  getDailyStats,
  londonDayBounds,
  londonWallTimeToInstant,
  SLOT_MS,
} from '@/lib/dayForecast';
import { formatLondonTime } from '@/lib/londonTime';
import southScotland from '@/test/fixtures/neso-regional-south-scotland-2026-10-11.json';
import london from '@/test/fixtures/neso-regional-london-fw48h-2026-10-11.json';
import national from '@/test/fixtures/neso-national-2026-10-11.json';

afterEach(() => vi.restoreAllMocks());

const SS = southScotland.data.data as unknown as ForecastData[];
const LDN = london.data.data as unknown as ForecastData[];
const GB = national.data as unknown as ForecastData[];
const NOW = new Date('2026-10-11T10:10:00Z'); // 11:10 BST, Sunday

function slot(
  from: string,
  forecast: number | null,
  extra: Partial<ForecastData['intensity']> = {},
): ForecastData {
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
  return Array.from({ length: slotCount }, (_, i) =>
    slot(new Date(start + i * SLOT_MS).toISOString(), value(i)),
  );
}

describe('getDailyStats (48-hour overview cards)', () => {
  it("keeps NESO's published zeros for South Scotland as real zeros, and flags the day", () => {
    // Live API, 11 Oct 2026: every South Scotland half-hour is forecast 0 (wind + nuclear).
    expect(SS.every((r) => r.intensity.forecast === 0)).toBe(true);
    const days = getDailyStats(SS, NOW);
    expect(days.map((d) => d.label)).toEqual(['Today', 'Tomorrow']);
    expect(days[0]).toMatchObject({ date: '2026-10-11', min: 0, avg: 0, max: 0, allZero: true });
  });

  it('computes real ranges for a non-zero region (London fw48h fixture)', () => {
    const days = getDailyStats(LDN, NOW);
    const today = days.find((d) => d.date === '2026-10-11')!;
    const values = LDN.filter(
      (r) => r.from >= '2026-10-10T23:00Z' && r.from < '2026-10-11T23:00Z',
    ).map((r) => r.intensity.forecast);
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
        {
          from: '2026-10-12T10:30:00Z',
          to: '2026-10-12T11:00:00Z',
          intensity: {} as ForecastData['intensity'],
        },
      ],
      NOW,
    );
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ min: null, avg: null, max: null, allZero: false });
  });

  it('buckets by the Europe/London day, not UTC or the device zone', () => {
    // 23:30Z on 11 Oct is 00:30 BST on Monday 12 Oct.
    const days = getDailyStats(
      [slot('2026-10-11T22:30:00Z', 100), slot('2026-10-11T23:30:00Z', 50)],
      NOW,
    );
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
    expect(days[0]).toMatchObject({
      label: 'Saturday',
      hasActuals: true,
      actualsEstimated: true,
      avgActual: 0,
    });
    expect(days[1]).toMatchObject({ label: 'Today', hasActuals: false, avgActual: null });
  });
});

describe('regional backfill', () => {
  const mockFetch = (rows: unknown[]) =>
    vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ data: { regionid: 2, shortname: 'South Scotland', data: rows } }),
          { status: 200 },
        ),
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
});

describe('London day bucketing and DST', () => {
  it('a normal day has 48 half-hours', () => {
    expect(londonDayBounds('2026-10-11').slotCount).toBe(48);
    expect(new Date(londonDayBounds('2026-10-11').start).toISOString()).toBe(
      '2026-10-10T23:00:00.000Z',
    );
  });

  it('Sun 25 Oct 2026 (clocks go back) has 50 half-hours and they all land on that day', () => {
    const b = londonDayBounds('2026-10-25');
    expect(b.slotCount).toBe(50);
    const days = getDailyStats(
      syntheticDay('2026-10-25', () => 100),
      NOW,
    );
    expect(days.map((d) => d.date)).toEqual(['2026-10-25']);
    expect(formatLondonTime(new Date(londonWallTimeToInstant('2026-10-25', 6)))).toBe('06:00');
  });

  it('Sun 29 Mar 2026 (clocks go forward) has 46 half-hours and they all land on that day', () => {
    expect(londonDayBounds('2026-03-29').slotCount).toBe(46);
    const days = getDailyStats(
      syntheticDay('2026-03-29', () => 100),
      NOW,
    );
    expect(days.map((d) => d.date)).toEqual(['2026-03-29']);
  });
});

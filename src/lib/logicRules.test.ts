import { describe, it, expect } from 'vitest';
import { nextCarbonRefreshDelay, latestCarbonRefreshTarget } from './carbonRefresh';
import {
  normalizeAlertThreshold,
  validAlertThreshold,
} from '../../supabase/functions/_shared/alert-threshold';
import { dispatchCarbon } from '../../supabase/functions/_shared/dispatch-carbon';
import { footprintPeriod, footprintBuckets } from './footprintPeriod';
import { fuelFreeDays, evidencedFuelHistory } from './fuelHistory';
import { londonDayBounds } from './londonTime';
import type { ForecastData } from './carbonApi';
import { greenWindow, usableForecast } from '../../supabase/functions/_shared/forecast-window';

describe('approved rule boundaries', () => {
  it('refreshes at 12:01:30 when opened at 12:00:30', () => {
    expect(nextCarbonRefreshDelay(Date.parse('2026-11-08T12:00:30Z'))).toBe(60_000);
  });
  it('refreshes at 12:31:30 when opened at 12:30:00', () => {
    expect(nextCarbonRefreshDelay(Date.parse('2026-11-08T12:30:00Z'))).toBe(90_000);
  });
  it('does not treat an unbuffered boundary as a released reading on resume', () => {
    expect(latestCarbonRefreshTarget(Date.parse('2026-11-08T12:00:30Z'))).toBe(
      Date.parse('2026-11-08T11:31:30Z'),
    );
  });
  it('accepts exactly 0–100 whole units for either alert', () => {
    expect([0, 1, 100].map(validAlertThreshold)).toEqual([true, true, true]);
    expect([-1, 101, 200, NaN, 1.5, '50'].map(validAlertThreshold)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(normalizeAlertThreshold(250)).toBe(100);
    expect(normalizeAlertThreshold(-10)).toBe(0);
  });
});

const interval = (from: string, to: string, value: number | null) => ({
  from,
  to,
  intensity: { actual: value, forecast: value },
});
describe('charging coverage', () => {
  const start = Date.parse('2026-11-08T12:00Z'),
    end = Date.parse('2026-11-08T13:00Z');
  it('missing intensity cannot become zero', () => {
    expect(
      dispatchCarbon([interval('2026-11-08T12:00Z', '2026-11-08T13:00Z', null)], start, end, 2),
    ).toBeNull();
  });
  it('missing half-hours cannot manufacture savings', () => {
    expect(
      dispatchCarbon([interval('2026-11-08T12:00Z', '2026-11-08T12:30Z', 0)], start, end, 2),
    ).toBeNull();
  });
  it('genuine zero uses the 230 benchmark', () => {
    expect(
      dispatchCarbon([interval('2026-11-08T12:00Z', '2026-11-08T13:00Z', 0)], start, end, 2),
    ).toEqual({ avg: 0, used: 0, saved: 460 });
  });
  it('savings above the 230 benchmark are zero', () => {
    expect(
      dispatchCarbon([interval('2026-11-08T12:00Z', '2026-11-08T13:00Z', 300)], start, end, 2)
        ?.saved,
    ).toBe(0);
  });
  it('weights partial intervals by actual overlap', () => {
    expect(
      dispatchCarbon(
        [
          interval('2026-11-08T12:00Z', '2026-11-08T12:30Z', 100),
          interval('2026-11-08T12:30Z', '2026-11-08T13:00Z', 200),
        ],
        start + 900_000,
        end,
        3,
      )?.used,
    ).toBe(500);
  });
});

const record = (time: string, kwh = 1) => ({
  id: time,
  mpan: 'a',
  interval_start: time,
  interval_end: new Date(Date.parse(time) + 1800_000).toISOString(),
  consumption_kwh: kwh,
  carbon_g: kwh * 100,
  intensity_gco2_kwh: 100,
  intensity_index: 'low',
});
describe('selected UK footprint period', () => {
  const data = {
    records: [
      record('2026-10-24T23:00Z'),
      record('2026-10-25T00:00Z'),
      record('2026-10-25T01:00Z'),
      record('2026-10-26T00:00Z', 10),
    ],
    summary: {
      total_kwh: 13,
      total_carbon_kg: 1.3,
      avg_intensity: 100,
      by_intensity_index: {},
      period_days: 3,
    },
  };
  it('totals use the same selected UK day as the chart', () => {
    const p = footprintPeriod(data, 'day', new Date('2026-10-25T12:00Z'));
    expect(p.summary.total_kwh).toBe(3);
    expect(p.coveredDays).toBe(1);
  });
  it('keeps the repeated autumn hours separate', () => {
    const p = footprintPeriod(data, 'day', new Date('2026-10-25T12:00Z'));
    expect(footprintBuckets(p.records, 'day').map((b) => b.date)).toEqual([
      '00:00',
      '01:00 BST',
      '01:00 GMT',
    ]);
  });
});

function fullDay(key: string): ForecastData[] {
  const b = londonDayBounds(key);
  return Array.from({ length: (b.to.getTime() + 1 - b.from.getTime()) / 1800_000 }, (_, i) => ({
    from: new Date(b.from.getTime() + i * 1800_000).toISOString(),
    to: new Date(b.from.getTime() + (i + 1) * 1800_000).toISOString(),
    intensity: { actual: 0, forecast: 0, index: 'very low' },
    generationmix: [{ fuel: 'gas', perc: 0 }],
  }));
}
describe('streak evidence', () => {
  it('requires all 50 slots on the autumn clock-change day', () => {
    const rows = fullDay('2026-10-25');
    expect(rows).toHaveLength(50);
    expect(fuelFreeDays(rows, 'gas').days).toBe(1);
    expect(fuelFreeDays(rows.slice(1), 'gas').days).toBe(0);
  });
  it('breaks streaks across missing calendar days', () => {
    expect(
      fuelFreeDays([...fullDay('2026-11-01'), ...fullDay('2026-11-03')], 'gas').longest?.days,
    ).toBe(1);
  });
  it('empty history never proves 30+ days', () => {
    expect(
      evidencedFuelHistory([], 'gas', new Date('2026-10-01Z'), new Date('2026-10-31Z')),
    ).toEqual({ lastSeen: null, exceededLookback: false });
  });
});

describe('daily outlook continuity', () => {
  const row = (hour: string, value: number) => ({
    from: `2026-11-08T${hour}:00Z`,
    to: new Date(Date.parse(`2026-11-08T${hour}:00Z`) + 1800_000).toISOString(),
    intensity: { forecast: value },
  });
  it('uses the approved 20g tolerance but stops at gaps', () => {
    const a = row('12:00', 10),
      b = row('12:30', 30),
      c = row('13:30', 0);
    expect(greenWindow([c, b, a], a)).toEqual({ from: a.from, to: b.to });
  });
  it('rejects duplicate or missing-value slots', () => {
    const a = row('12:00', 10);
    expect(usableForecast([a, { ...a }, row('13:00', NaN)])).toEqual([]);
  });
});

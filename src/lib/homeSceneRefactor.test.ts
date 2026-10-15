import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSmartTip } from '@/lib/getSmartTip';
import type { ForecastData } from '@/lib/carbonApi';
import { buildTurbineLayout } from '@/lib/turbineLayout';

function slot(hoursFromNow: number, forecast: number): ForecastData {
  const from = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + (hoursFromNow + 0.5) * 60 * 60 * 1000).toISOString();
  return {
    from,
    to,
    intensity: { forecast, index: 'moderate' as const, actual: forecast },
  };
}

describe('getSmartTip', () => {
  // Pin the clock: tips depend on the London time of day, so an unpinned
  // clock made 'celebrates very low current intensity' flaky (BH-19).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-15T11:10:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a fallback when forecast is too short', () => {
    expect(getSmartTip(120, [])).toContain('Forecast not in yet');
  });

  it('celebrates very low current intensity', () => {
    // Contiguous half hours (a gapped forecast now says data is missing instead).
    const forecast = Array.from({ length: 48 }, (_, i) => slot(0.5 + i * 0.5, 80));
    expect(getSmartTip(40, forecast)).toMatch(/^Now's good\. It won't get any cleaner/);
  });

  it('suggests waiting when a nearby window is much cleaner', () => {
    // Six consecutive clean half-hour slots (~3h) starting ~2h out
    const forecast = Array.from({ length: 36 }, (_, i) => {
      const hoursFromNow = 0.5 + i * 0.5;
      const clean = hoursFromNow >= 2 && hoursFromNow < 5;
      return slot(hoursFromNow, clean ? 55 : 200);
    });
    // The live reading stands in for the missing current half hour, so "start
    // now" is the 3-hour window average (180, 200, 200, 200, 55, 55), as it is
    // whenever the current half hour is in the forecast.
    expect(getSmartTip(180, forecast)).toMatch(
      /^Wait about 2 hours\. It'll be around 65% cleaner \(148 to 55/,
    );
  });
});

describe('buildTurbineLayout', () => {
  it('always returns at least two turbines', () => {
    expect(buildTurbineLayout(0).length).toBe(2);
  });

  it('scales turbine count with wind percentage', () => {
    expect(buildTurbineLayout(3).length).toBe(2);
    expect(buildTurbineLayout(12).length).toBeGreaterThan(2);
    expect(buildTurbineLayout(40).length).toBe(8);
    expect(buildTurbineLayout(40).every((slot) => Number.isFinite(slot.bottom))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
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
  it('returns a fallback when forecast is too short', () => {
    expect(getSmartTip(120, [])).toContain('Forecast not in yet');
  });

  it('celebrates very low current intensity', () => {
    const forecast = Array.from({ length: 24 }, (_, i) => slot(i + 1, 80));
    expect(getSmartTip(40, forecast)).toMatch(/^Now's good\. It won't get any cleaner/);
  });

  it('suggests waiting when a nearby window is much cleaner', () => {
    // Six consecutive clean half-hour slots (~3h) starting ~2h out
    const forecast = Array.from({ length: 36 }, (_, i) => {
      const hoursFromNow = 0.5 + i * 0.5;
      const clean = hoursFromNow >= 2 && hoursFromNow < 5;
      return slot(hoursFromNow, clean ? 55 : 200);
    });
    expect(getSmartTip(180, forecast)).toMatch(/^Wait about 2 hours\. It'll be around 70% cleaner \(180 to 55/);
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

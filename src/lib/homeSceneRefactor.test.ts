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
    expect(getSmartTip(120, [])).toContain('Check back later');
  });

  it('celebrates very low current intensity', () => {
    const forecast = Array.from({ length: 24 }, (_, i) => slot(i + 1, 80));
    expect(getSmartTip(40, forecast)).toContain('excellent');
  });

  it('suggests waiting when later intensity is much cleaner', () => {
    const forecast = Array.from({ length: 24 }, (_, i) => slot(i + 1, i === 4 ? 60 : 200));
    expect(getSmartTip(180, forecast)).toMatch(/wait until/i);
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

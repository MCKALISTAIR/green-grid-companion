import { describe, expect, it } from 'vitest';
import { getBestWorstWindows, isWorstWindowWorthFlagging } from './forecastWindows';
import type { ForecastData } from '@/lib/carbonApi';

function slot(hoursFromNow: number, intensity: number): ForecastData {
  const from = new Date(Date.now() + hoursFromNow * 3600_000);
  const to = new Date(from.getTime() + 30 * 60_000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    intensity: { forecast: intensity, index: 'moderate', actual: intensity },
  };
}

describe('getBestWorstWindows', () => {
  it('returns null when forecast is too short', () => {
    expect(getBestWorstWindows([slot(0.5, 100)])).toBeNull();
  });

  it('picks the lowest and highest 3-hour averages', () => {
    const forecast: ForecastData[] = [];
    // 6 slots of dirty, then 6 of clean, then 6 of dirty again
    for (let i = 0; i < 6; i++) forecast.push(slot(0.5 + i * 0.5, 300));
    for (let i = 0; i < 6; i++) forecast.push(slot(3.5 + i * 0.5, 40));
    for (let i = 0; i < 6; i++) forecast.push(slot(6.5 + i * 0.5, 280));

    const windows = getBestWorstWindows(forecast);
    expect(windows).not.toBeNull();
    expect(windows!.minAvg).toBe(40);
    expect(windows!.maxAvg).toBeGreaterThanOrEqual(280);
  });
});

describe('isWorstWindowWorthFlagging', () => {
  it('skips flat forecasts', () => {
    expect(isWorstWindowWorthFlagging({ minAvg: 180, maxAvg: 190 })).toBe(false);
  });
  it('skips big percentages of tiny numbers', () => {
    expect(isWorstWindowWorthFlagging({ minAvg: 20, maxAvg: 30 })).toBe(false);
  });
  it('flags a real spread', () => {
    expect(isWorstWindowWorthFlagging({ minAvg: 90, maxAvg: 240 })).toBe(true);
  });
});

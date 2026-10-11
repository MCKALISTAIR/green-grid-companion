import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ForecastData } from '@/lib/carbonApi';
import { getRegionalHistoryAndForecast } from '@/lib/carbonApi';
import {
  HISTORY_Y_MIN_CEILING,
  averageForecast,
  historyYAxisMax,
  isNearZeroRange,
  toHistoryPoint,
} from '@/lib/historyChart';
import history from '@/test/fixtures/neso-regional-south-scotland-history-2026-10-04.json';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Live NESO regional API, South Scotland, 4 to 11 Oct 2026 (357 half-hours).
const ROWS = history.data.data as unknown as ForecastData[];

describe('/history chart (South Scotland, 4 to 11 Oct)', () => {
  it('the live data really is mostly 0 with single-digit blips', () => {
    const f = ROWS.map((r) => r.intensity.forecast);
    expect(f.filter((v) => v === 0).length / f.length).toBeGreaterThan(0.95);
    expect(Math.max(...f)).toBe(6);
  });

  it('the y-axis no longer stretches a 6g blip across the chart', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-11T10:10:00Z'));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(history), { status: 200 }));
    const rows = await getRegionalHistoryAndForecast(2, 'x', 'y');
    const points = rows.map(toHistoryPoint);
    expect(historyYAxisMax(points)).toBe(HISTORY_Y_MIN_CEILING);
    expect(isNearZeroRange(points)).toBe(true);
    expect(averageForecast(rows)).toBe(0);
  });

  it('busy weeks still scale to the data', () => {
    expect(historyYAxisMax([{ forecast: 209, actual: 220 }])).toBe(250);
    expect(isNearZeroRange([{ forecast: 209, actual: null }])).toBe(false);
  });

  it('missing values are gaps (null), not 0, and do not drag the average down', () => {
    const rows = [
      { from: 'a', to: 'b', intensity: { forecast: 100, index: 'moderate' } },
      { from: 'b', to: 'c', intensity: { forecast: null, actual: undefined, index: 'moderate' } },
      { from: 'c', to: 'd', intensity: {} },
    ] as unknown as ForecastData[];
    expect(rows.map(toHistoryPoint)).toEqual([
      { forecast: 100, actual: null },
      { forecast: null, actual: null },
      { forecast: null, actual: null },
    ]);
    expect(averageForecast(rows)).toBe(100);
    expect(averageForecast([rows[1]])).toBeNull();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ForecastData } from '@/lib/carbonApi';
import { getRegionalHistoryAndForecast } from '@/lib/carbonApi';
import { getForecastMax, getSlotDisplayValue } from '@/lib/forecastUtils';
import { getForecastHourInsight } from '@/lib/forecastHourInsight';
import southScotland from '@/test/fixtures/neso-regional-south-scotland-2026-10-11.json';

// Live NESO data for South Scotland, 11 Oct 2026. Forecast is 0 every half hour,
// but the generation mix has a little imports (1.7% at 10:00Z), which GridSense's
// mix calculation turns into 4 gCO2/kWh. That 4 is the bar Alistair saw; the
// tooltip said "Forecast: 0g".
const NOW = new Date('2026-10-11T10:10:00Z');

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function loadSouthScotland(): Promise<ForecastData[]> {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(southScotland), { status: 200 }),
  );
  return getRegionalHistoryAndForecast(2, 'x', 'y');
}

describe('hourly forecast bar and tooltip agree', () => {
  it('does not backfill a GridSense estimate into current or future regional slots', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const rows = await loadSouthScotland();
    const current = rows.find((r) => r.from === '2026-10-11T10:00Z')!;
    expect(current.intensity.forecast).toBe(0);
    expect(current.intensity.actual ?? null).toBeNull();
    // A finished half hour with imports still gets a labelled estimate.
    const past = rows.find((r) => r.from === '2026-10-11T09:30Z')!;
    expect(past.intensity.actual).toBe(3);
    expect(past.intensity.actualEstimated).toBe(true);
  });

  it('bar value equals the tooltip forecast for the current half hour', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const rows = await loadSouthScotland();
    const i = rows.findIndex((r) => r.from === '2026-10-11T10:00Z');
    expect(getSlotDisplayValue(rows[i], NOW)).toBe(rows[i].intensity.forecast);
    expect(getForecastHourInsight(rows, i, 0, 'plain', NOW)!.value).toBe(0);
  });

  it('uses the actual only once the half hour has ended', () => {
    const item: ForecastData = {
      from: '2026-10-11T10:00:00Z',
      to: '2026-10-11T10:30:00Z',
      intensity: { forecast: 0, actual: 4, actualEstimated: true, index: 'very low' },
    };
    expect(getSlotDisplayValue(item, new Date('2026-10-11T10:10:00Z'))).toBe(0);
    expect(getSlotDisplayValue(item, new Date('2026-10-11T10:31:00Z'))).toBe(4);
  });

  it('missing values are null, never 0, and do not break the bar scale', () => {
    const item = {
      from: '2026-10-11T12:00:00Z',
      to: '2026-10-11T12:30:00Z',
      intensity: { forecast: null, index: 'moderate' },
    } as unknown as ForecastData;
    expect(getSlotDisplayValue(item, NOW)).toBeNull();
    expect(getForecastMax([item], NOW)).toBe(200);
  });
});

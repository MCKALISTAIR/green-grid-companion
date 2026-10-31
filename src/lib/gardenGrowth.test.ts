import { describe, expect, it } from 'vitest';
import type { ForecastData } from '@/lib/carbonApi';
import { countLowCarbonDays, gardenWindowKeys, gardenWindowRange } from './gardenGrowth';
import { gardenDaysToStage } from '@/hooks/useSceneGrowth';

const NOW = new Date('2026-10-29T21:00:00Z');

/** 48 half-hours per UK day for the 14 days before NOW, one value per day. */
function rows(perDay: (dayIndex: number) => number, extra: ForecastData[] = []): ForecastData[] {
  const { from } = gardenWindowRange(NOW);
  const out: ForecastData[] = [];
  // 14 days; 25 Oct (clock change) has 50 slots, so walk by time not by count.
  const end = gardenWindowRange(NOW).to.getTime();
  const keys = gardenWindowKeys(NOW);
  for (let t = from.getTime(); t < end; t += 1800000) {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(t);
    const v = perDay(keys.indexOf(key));
    out.push({
      from: new Date(t).toISOString(),
      to: new Date(t + 1800000).toISOString(),
      intensity: { forecast: v, actual: v, index: 'moderate' },
    } as ForecastData);
  }
  return [...out, ...extra];
}

describe('gardenGrowth (BH-143)', () => {
  it('window is the 14 whole UK days before today', () => {
    const keys = gardenWindowKeys(NOW);
    expect(keys).toHaveLength(14);
    expect(keys[0]).toBe('2026-10-15');
    expect(keys[13]).toBe('2026-10-28');
  });

  it('lush week: every day low counts 14 and gives stage 4', () => {
    const n = countLowCarbonDays(
      rows(() => 60),
      NOW,
    );
    expect(n).toBe(14);
    expect(gardenDaysToStage(n)).toBe(4);
  });

  it('thin week: dirty days do not count', () => {
    const n = countLowCarbonDays(
      rows((d) => (d < 2 ? 80 : 210)),
      NOW,
    );
    expect(n).toBe(2);
    expect(gardenDaysToStage(n)).toBe(1);
  });

  it('uses the NESO band edge: 89 g average is low, 90 g is not', () => {
    expect(
      countLowCarbonDays(
        rows((d) => (d === 0 ? 89 : 90)),
        NOW,
      ),
    ).toBe(1);
    expect(
      countLowCarbonDays(
        rows(() => 24),
        NOW,
      ),
    ).toBe(14);
  });

  it('averages the day, not single half-hours', () => {
    const r = rows(() => 0).map((row, i) => {
      const v = i % 2 ? 20 : 200; // average 110 g: moderate
      return { ...row, intensity: { ...row.intensity, actual: v, forecast: v } };
    });
    expect(countLowCarbonDays(r, NOW)).toBe(0);
  });

  it('ignores today and days outside the window, and days with no data', () => {
    const today = {
      from: '2026-10-29T10:00:00Z',
      to: '2026-10-29T10:30:00Z',
      intensity: { forecast: 10, actual: 10, index: 'very low' },
    } as ForecastData;
    expect(countLowCarbonDays([today], NOW)).toBe(0);
    expect(countLowCarbonDays([], NOW)).toBe(0);
  });

  it('falls back to forecast when actual is missing', () => {
    const r = rows(() => 50).map((row) => ({
      ...row,
      intensity: { ...row.intensity, actual: null as unknown as number },
    }));
    expect(countLowCarbonDays(r, NOW)).toBe(14);
  });
});

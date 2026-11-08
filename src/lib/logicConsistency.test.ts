import { describe, it, expect } from 'vitest';
import { getBestWorstWindows } from './forecastWindows';
import { processYearData } from './yearWrappedUtils';
import { mpansByUser } from '../../supabase/functions/_shared/digest-scope';

const slot = (i: number, value = 0) => ({
  from: new Date(Date.UTC(2090, 0, 1, 0, i * 30)).toISOString(),
  to: new Date(Date.UTC(2090, 0, 1, 0, (i + 1) * 30)).toISOString(),
  intensity: { forecast: value, actual: value, index: 'very low' },
  generationmix: [{ fuel: 'wind', perc: 100 }],
});

describe('logic consistency regressions', () => {
  it('rejects a three-hour forecast spanning a missing half-hour', () => {
    expect(getBestWorstWindows([0, 1, 2, 4, 5, 6].map(i => slot(i)))).toBeNull();
  });
  it('rejects duplicate half-hours rather than inventing three hours', () => {
    expect(getBestWorstWindows([0, 1, 2, 2, 3, 4].map(i => slot(i)))).toBeNull();
  });
  it('rejects missing intensity', () => {
    expect(getBestWorstWindows([0, 1, 2, 3, 4, 5].map(i => slot(i, i === 2 ? NaN : 10)))).toBeNull();
  });
  it('retains genuine zero-carbon windows', () => {
    expect(getBestWorstWindows([0, 1, 2, 3, 4, 5].map(i => slot(i)))?.minAvg).toBe(0);
  });
  it('excludes export and inactive meters from consumption reports', () => {
    const by = mpansByUser([
      { user_id: 'a', mpan: 'import', meter_type: 'import', is_active: true },
      { user_id: 'a', mpan: 'export', meter_type: 'export', is_active: true },
      { user_id: 'a', mpan: 'inactive', meter_type: 'import', is_active: false },
    ]);
    expect([...by.get('a') ?? []]).toEqual(['import']);
  });
  it('includes genuine zero intensity in annual statistics', () => {
    const result = processYearData([slot(0, 0), slot(1, 100)], 2090);
    expect(result.avgIntensity).toBe(50);
    expect(result.lowestIntensity?.value).toBe(0);
  });
  it('does not treat absent fuel evidence as coal-free', () => {
    expect(processYearData(Array.from({ length: 48 }, (_, i) => slot(i)), 2090).coalFreeDays).toBe(0);
  });
});
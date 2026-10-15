import { describe, it, expect } from 'vitest';
import { parseIntensityPoint } from '../../../supabase/functions/_shared/intensity-point.ts';

describe('parseIntensityPoint (octopus-energy footprint)', () => {
  it('uses actual, then forecast, with the real band', () => {
    expect(
      parseIntensityPoint({
        from: 'a',
        intensity: { actual: 120, forecast: 130, index: 'moderate' },
      }),
    ).toEqual({ intensity: 120, index: 'moderate' });
    expect(
      parseIntensityPoint({ from: 'a', intensity: { actual: null, forecast: 80, index: 'Low' } }),
    ).toEqual({ intensity: 80, index: 'low' });
  });

  it('skips half-hours without a usable number or band instead of inventing 0 / moderate', () => {
    expect(
      parseIntensityPoint({ from: 'a', intensity: { actual: null, forecast: null, index: 'low' } }),
    ).toBeNull();
    expect(parseIntensityPoint({ from: 'a', intensity: { forecast: 90 } })).toBeNull();
    expect(
      parseIntensityPoint({ from: 'a', intensity: { forecast: 90, index: 'meh' } }),
    ).toBeNull();
    expect(
      parseIntensityPoint({ from: 'a', intensity: { forecast: -5, index: 'low' } }),
    ).toBeNull();
    expect(parseIntensityPoint({ from: 'a' })).toBeNull();
    expect(parseIntensityPoint(null)).toBeNull();
  });
});

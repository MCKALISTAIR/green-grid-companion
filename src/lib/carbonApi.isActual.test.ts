import { describe, expect, it } from 'vitest';
import { isActualIntensity, pickLiveIntensity } from './carbonApi';

describe('isActualIntensity (#233 popover wording)', () => {
  it('is true only when NESO has published an actual', () => {
    expect(isActualIntensity({ forecast: 200, actual: 215 })).toBe(true);
    expect(isActualIntensity({ forecast: 200, actual: 0 })).toBe(true);
    expect(isActualIntensity({ forecast: 200, actual: null })).toBe(false);
    expect(isActualIntensity({ forecast: 200 })).toBe(false);
    expect(isActualIntensity(undefined)).toBe(false);
  });

  it('agrees with the figure pickLiveIntensity shows', () => {
    const r = { forecast: 200, actual: 215 };
    expect(pickLiveIntensity(r)).toBe(r.actual);
    const f = { forecast: 200, actual: null };
    expect(pickLiveIntensity(f)).toBe(f.forecast);
  });
});

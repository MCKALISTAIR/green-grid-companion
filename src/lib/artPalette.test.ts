import { describe, expect, it } from 'vitest';
import { MOOD } from './artPalette';

describe('MOOD', () => {
  it('PR-2b truth rule: no haze at very low or low', () => {
    expect(MOOD['very low'].a).toBe(0);
    expect(MOOD.low.a).toBe(0);
  });
  it('haze only grows with the band and stays under the 0.45 ceiling', () => {
    expect(MOOD.moderate.a).toBeGreaterThan(0);
    expect(MOOD.high.a).toBeGreaterThan(MOOD.moderate.a);
    expect(MOOD['very high'].a).toBeGreaterThan(MOOD.high.a);
    expect(MOOD['very high'].a).toBeLessThanOrEqual(0.45);
  });
});

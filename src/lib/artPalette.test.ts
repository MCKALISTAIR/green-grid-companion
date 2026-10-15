import { describe, expect, it } from 'vitest';
import { getMoodBand, MOOD } from './artPalette';

describe('getMoodBand', () => {
  it('mint zero glow only for a 0 g reading', () => {
    expect(getMoodBand(0, 'very low')).toBe('zero');
    expect(getMoodBand(12, 'very low')).toBe('very low');
  });
  it('uses the NESO index, falling back to thresholds', () => {
    expect(getMoodBand(260, 'High')).toBe('high');
    expect(getMoodBand(340, '')).toBe('very high');
  });
  it('very low is a no-op and dirtier bands only drain colour', () => {
    expect(MOOD['very low'].a).toBe(0);
    expect(MOOD['very high'].sat).toBeLessThan(MOOD.low.sat);
  });
});

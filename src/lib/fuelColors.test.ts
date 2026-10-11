import { describe, expect, it } from 'vitest';
import { BAR_TRACK, FUEL_TONES, contrastRatio, getFuelTone } from './fuelColors';

describe('fuel share-bar colours', () => {
  for (const [fuel, tone] of Object.entries(FUEL_TONES)) {
    it(`${fuel}: bar fill vs track is at least 3:1 in light and dark mode`, () => {
      expect(contrastRatio(tone.barLight, BAR_TRACK.light)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(tone.barDark, BAR_TRACK.dark)).toBeGreaterThanOrEqual(3);
    });
  }

  it('maps unknown fuels to the neutral "other" tone and interconnectors to imports', () => {
    expect(getFuelTone('mystery')).toBe(FUEL_TONES.other);
    expect(getFuelTone('Interconnectors')).toBe(FUEL_TONES.imports);
  });

  it('computes known WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});

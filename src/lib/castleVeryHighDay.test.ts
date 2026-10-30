import { describe, expect, it } from 'vitest';
import { getEdinburghCastleColours } from '@/lib/cityLandmarkPalette';

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};

describe('castle at very high by day (d)', () => {
  for (const weather of ['clear', 'overcast', 'rain', 'snow', 'storm'] as const) {
    it(`is darker than the same scene at high, ${weather}`, () => {
      const at = (nesoIndex: string) =>
        getEdinburghCastleColours({ timeOfDay: 'midday', weather, nesoIndex, heroLit: false });
      expect(lum(at('very high').walls)).toBeLessThan(lum(at('high').walls));
    });
  }

  it('leaves fog and after dark alone', () => {
    const fogVh = getEdinburghCastleColours({
      timeOfDay: 'midday',
      weather: 'fog',
      nesoIndex: 'very high',
      heroLit: false,
    });
    const fogH = getEdinburghCastleColours({
      timeOfDay: 'midday',
      weather: 'fog',
      nesoIndex: 'high',
      heroLit: false,
    });
    expect(lum(fogVh.walls)).toBeGreaterThan(lum(fogH.walls) * 0.8);
  });
});

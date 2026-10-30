import { describe, expect, it } from 'vitest';
import { getEdinburghCastleColours } from '@/lib/cityLandmarkPalette';

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};

describe('castle day silhouette at every hazy band', () => {
  // The haze used to pull the walls paler as the band rose. Now the hazy bands
  // by day are at least as dark as low, so the castle never flips to pale stone.
  for (const weather of ['clear', 'overcast', 'rain', 'snow', 'storm'] as const) {
    for (const band of ['moderate', 'high', 'very high']) {
      it(`${band}, ${weather}: walls no paler than at low`, () => {
        const at = (nesoIndex: string) =>
          getEdinburghCastleColours({ timeOfDay: 'midday', weather, nesoIndex, heroLit: false });
        expect(lum(at(band).walls)).toBeLessThanOrEqual(lum(at('low').walls) * 1.05);
      });
    }
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

describe('capHazeInFront', () => {
  it('matches the composite under the capped haze', async () => {
    const { capHazeInFront } = await import('@/lib/cityLandmarkPalette');
    const { HAZE_TINT } = await import('@/lib/sceneHaze');
    const c = '#6a6f78';
    const out = capHazeInFront(c, 0.45, 0.25);
    const comp = (hex: string, a: number) =>
      [1, 3, 5].map(
        (i) =>
          parseInt(hex.slice(i, i + 2), 16) * (1 - a) + parseInt(HAZE_TINT.slice(i, i + 2), 16) * a,
      );
    comp(out, 0.45).forEach((v, i) => expect(Math.abs(v - comp(c, 0.25)[i])).toBeLessThan(1));
  });

  it('is a no-op when the haze is already at or under the cap', async () => {
    const { capHazeInFront } = await import('@/lib/cityLandmarkPalette');
    expect(capHazeInFront('#6a6f78', 0.2, 0.25)).toBe('#6a6f78');
  });
});

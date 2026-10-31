import { describe, expect, it } from 'vitest';
import { NIGHT_FAR_HILLS } from './BackgroundMountains';

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

describe('night far hills (scene audit item 10)', () => {
  it('are lighter than the night horizon sky, so the ridge reads', () => {
    const sky = lum('#392763');
    for (const c of Object.values(NIGHT_FAR_HILLS)) expect(lum(c)).toBeGreaterThan(sky);
  });
});

import { describe, expect, it } from 'vitest';
import { bandFor, nesoBand } from './nesoBand';
import { getCleanlinessBand } from '@/hooks/useCleanlinessBand';
import { getCarbonIndex } from './sceneUtils';
import { getMoodBand } from './artPalette';

describe('nesoBand (NESO 2026 Table 2)', () => {
  it.each([
    [0, 'very low'],
    [24, 'very low'],
    [25, 'low'],
    [89, 'low'],
    [90, 'moderate'],
    [169, 'moderate'],
    [170, 'high'],
    [215, 'high'],
    [230, 'high'],
    [231, 'very high'],
    [400, 'very high'],
  ] as const)('%i g -> %s', (g, band) => {
    expect(nesoBand(g)).toBe(band);
    expect(getCarbonIndex(g)).toBe(band);
  });

  it('prefers NESO index when given, as the label does', () => {
    expect(bandFor(215, 'moderate')).toBe('moderate');
    expect(bandFor(215, '')).toBe('high');
  });

  it('BH-139: 215 g gives the high scene, matching the label', () => {
    expect(getCleanlinessBand(215)).toBe('dirty');
    expect(getMoodBand(215, '')).toBe('high');
  });

  it.each([
    [24, 'very-clean'],
    [25, 'clean'],
    [89, 'clean'],
    [90, 'moderate'],
    [169, 'moderate'],
    [170, 'dirty'],
    [230, 'dirty'],
    [231, 'very-dirty'],
  ] as const)('scene cleanliness at %i g is %s', (g, b) => {
    expect(getCleanlinessBand(g)).toBe(b);
  });
});

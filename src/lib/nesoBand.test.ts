import { describe, expect, it } from 'vitest';
import { bandFor, nesoBand } from './nesoBand';
import { getCleanlinessBand } from '@/hooks/useCleanlinessBand';
import { getCarbonIndex } from './sceneUtils';
import { getHazeBand } from './sceneHaze';

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

  it('uses the grams, not NESO index, when there is a number', () => {
    expect(bandFor(215, 'moderate')).toBe('high');
    expect(bandFor(100, 'low')).toBe('moderate');
    expect(bandFor(215, '')).toBe('high');
    expect(bandFor(0, 'moderate')).toBe('very low');
  });

  it('falls back to NESO index only without a number', () => {
    expect(bandFor(undefined, 'Low')).toBe('low');
    expect(bandFor(Number.NaN, 'high')).toBe('high');
    expect(bandFor(null, null)).toBe('moderate');
  });

  it('BH-139: 215 g gives the high scene, matching the label', () => {
    expect(getCleanlinessBand(215)).toBe('dirty');
    expect(getHazeBand('', 215)).toBe('high');
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

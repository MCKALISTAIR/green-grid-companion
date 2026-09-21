import { describe, expect, it } from 'vitest';
import { getCityHeroEmphasis } from './cityHeroDemotion';
import type { CleanlinessBand } from '@/hooks/useCleanlinessBand';

const BANDS: CleanlinessBand[] = [
  'very-clean',
  'clean',
  'moderate',
  'dirty',
  'very-dirty',
];

describe('getCityHeroEmphasis', () => {
  it('gives every band exactly one hero and keeps non-hero props quieter', () => {
    for (const band of BANDS) {
      const e = getCityHeroEmphasis(band);
      expect(e.hero).toBeTruthy();
      expect(e.eyeOpacity).toBeGreaterThan(0);
      expect(e.eyeOpacity).toBeLessThanOrEqual(1);
      expect(e.bessOpacity).toBeGreaterThan(0);
      expect(e.bessOpacity).toBeLessThanOrEqual(1);
      expect(e.trafficCount).toBeGreaterThanOrEqual(2);
      expect(e.trafficCount).toBeLessThanOrEqual(5);
    }
  });

  it('makes London Eye the only full-opacity landmark when very clean', () => {
    const e = getCityHeroEmphasis('very-clean');
    expect(e.hero).toBe('london-eye');
    expect(e.eyeOpacity).toBe(1);
    expect(e.bessOpacity).toBeLessThan(0.5);
    expect(e.showCrane).toBe(false);
  });

  it('makes BESS the hero at moderate intensity', () => {
    const e = getCityHeroEmphasis('moderate');
    expect(e.hero).toBe('bess');
    expect(e.bessOpacity).toBe(1);
    expect(e.eyeOpacity).toBeLessThan(0.5);
    expect(e.showPigeons).toBe(false);
  });

  it('clears wildlife and brings industrial clutter when dirty', () => {
    const dirty = getCityHeroEmphasis('dirty');
    const veryDirty = getCityHeroEmphasis('very-dirty');
    expect(dirty.showPigeons).toBe(false);
    expect(dirty.showCrane).toBe(true);
    expect(veryDirty.eyeOpacity).toBeLessThan(dirty.eyeOpacity);
    expect(veryDirty.skylineOpacity).toBeLessThan(dirty.skylineOpacity);
  });
});

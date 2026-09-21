import { describe, expect, it } from 'vitest';
import { getCityHeroEmphasis, isCityHotspotActive } from './cityHeroDemotion';
import type { CleanlinessBand } from '@/hooks/useCleanlinessBand';

const BANDS: CleanlinessBand[] = [
  'very-clean',
  'clean',
  'moderate',
  'dirty',
  'very-dirty',
];

describe('getCityHeroEmphasis', () => {
  it('gives every band exactly one hero', () => {
    for (const band of BANDS) {
      const e = getCityHeroEmphasis(band);
      expect(e.hero).toBeTruthy();
      expect(e.eyeOpacity).toBeGreaterThanOrEqual(0);
      expect(e.eyeOpacity).toBeLessThanOrEqual(1);
      expect(e.bessOpacity).toBeGreaterThanOrEqual(0);
      expect(e.bessOpacity).toBeLessThanOrEqual(1);
      expect(e.trafficCount).toBeGreaterThanOrEqual(0);
      expect(e.trafficCount).toBeLessThanOrEqual(5);
    }
  });

  it('makes London Eye the only full-opacity landmark when very clean', () => {
    const e = getCityHeroEmphasis('very-clean');
    expect(e.hero).toBe('london-eye');
    expect(e.eyeOpacity).toBe(1);
    expect(e.bessOpacity).toBeLessThan(0.2);
    expect(e.skylineOpacity).toBeLessThan(0.5);
    expect(e.trafficCount).toBe(0);
    expect(e.showBus).toBe(false);
    expect(e.showCrane).toBe(false);
  });

  it('makes BESS the hero at moderate and ghosts the Eye', () => {
    const e = getCityHeroEmphasis('moderate');
    expect(e.hero).toBe('bess');
    expect(e.bessOpacity).toBe(1);
    expect(e.eyeOpacity).toBeLessThan(0.2);
    expect(e.trafficCount).toBe(0);
    expect(e.showPigeons).toBe(false);
  });

  it('clears wildlife and keeps industrial clutter sparse until very dirty', () => {
    const dirty = getCityHeroEmphasis('dirty');
    const veryDirty = getCityHeroEmphasis('very-dirty');
    expect(dirty.showPigeons).toBe(false);
    expect(dirty.showCrane).toBe(false);
    expect(veryDirty.showCrane).toBe(true);
    expect(veryDirty.eyeOpacity).toBeLessThanOrEqual(dirty.eyeOpacity);
    expect(veryDirty.skylineOpacity).toBeLessThan(dirty.skylineOpacity);
  });

  it('only activates the hero hotspot by default', () => {
    const clean = getCityHeroEmphasis('very-clean');
    expect(isCityHotspotActive('london-eye', 'london-eye', clean)).toBe(true);
    expect(isCityHotspotActive('london-eye', 'bess', clean)).toBe(false);

    const moderate = getCityHeroEmphasis('moderate');
    expect(isCityHotspotActive('bess', 'bess', moderate)).toBe(true);
    expect(isCityHotspotActive('bess', 'london-eye', moderate)).toBe(false);
  });
});

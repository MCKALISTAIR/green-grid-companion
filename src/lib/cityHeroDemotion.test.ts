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
  it('keeps city presence: mass + micro-life floors', () => {
    for (const band of BANDS) {
      const e = getCityHeroEmphasis(band);
      expect(e.hero).toBeTruthy();
      expect(e.eyeOpacity).toBeGreaterThanOrEqual(0.32);
      expect(e.frontOpacity).toBeGreaterThanOrEqual(0.75);
      expect(e.skylineOpacity).toBeGreaterThanOrEqual(0.7);
    }
  });

  it('makes London Eye the hero when very clean without emptying the road', () => {
    const e = getCityHeroEmphasis('very-clean');
    expect(e.hero).toBe('london-eye');
    expect(e.eyeOpacity).toBe(1);
    expect(e.eyeScale).toBeGreaterThan(1);
    expect(e.bessOpacity).toBeLessThan(0.5);
    expect(e.trafficCount).toBeGreaterThanOrEqual(1);
    expect(e.pigeonCount).toBeGreaterThanOrEqual(1);
    expect(e.showTubeFlash).toBe(true);
  });

  it('makes BESS the hero at moderate with a readable Eye still in shot', () => {
    const e = getCityHeroEmphasis('moderate');
    expect(e.hero).toBe('bess');
    expect(e.bessOpacity).toBe(1);
    expect(e.bessScale).toBeGreaterThan(1);
    expect(e.eyeOpacity).toBeGreaterThanOrEqual(0.35);
    expect(e.trafficCount).toBeGreaterThanOrEqual(1);
  });

  it('only activates the hero hotspot by default for competing landmarks', () => {
    const clean = getCityHeroEmphasis('very-clean');
    expect(isCityHotspotActive('london-eye', 'london-eye', clean)).toBe(true);
    // BESS is still faintly visible but below hotspot threshold when Eye is hero
    expect(isCityHotspotActive('london-eye', 'bess', clean)).toBe(false);

    const moderate = getCityHeroEmphasis('moderate');
    expect(isCityHotspotActive('bess', 'bess', moderate)).toBe(true);
    expect(isCityHotspotActive('bess', 'london-eye', moderate)).toBe(true);
  });
});

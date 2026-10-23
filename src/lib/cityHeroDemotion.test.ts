import { describe, expect, it } from 'vitest';
import { getCityHeroEmphasis } from './cityHeroDemotion';
import type { CleanlinessBand } from '@/hooks/useCleanlinessBand';

const BANDS: CleanlinessBand[] = ['very-clean', 'clean', 'moderate', 'dirty', 'very-dirty'];

describe('getCityHeroEmphasis', () => {
  it('keeps city presence: mass + micro-life floors', () => {
    for (const band of BANDS) {
      const e = getCityHeroEmphasis(band);
      expect(e.hero).toBeTruthy();
      expect(e.landmarkOpacity).toBeGreaterThanOrEqual(0.32);
      expect(e.frontOpacity).toBeGreaterThanOrEqual(0.75);
      expect(e.skylineOpacity).toBeGreaterThanOrEqual(0.7);
    }
  });

  it('makes London Eye the hero when very clean without emptying the road', () => {
    const e = getCityHeroEmphasis('very-clean');
    expect(e.hero).toBe('landmark');
    expect(e.landmarkOpacity).toBe(1);
    expect(e.landmarkScale).toBeGreaterThan(1);
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
    expect(e.landmarkOpacity).toBeGreaterThanOrEqual(0.35);
    expect(e.trafficCount).toBeGreaterThanOrEqual(1);
  });
});

import { describe, expect, it } from 'vitest';
import {
  getHazeBand,
  getHazeTokens,
  HAZE_MAX_OPACITY,
  showsSmoke,
  SMOKE_BY_BAND,
  STAR_HAZE_FACTOR,
  SUN_HALO_FACTOR,
} from './sceneHaze';

describe('getHazeBand (PR-2b truth rule)', () => {
  it('no haze at very low, low, or with no data', () => {
    expect(getHazeBand('very low', 20)).toBe('none');
    expect(getHazeBand('low', 120)).toBe('none');
    expect(getHazeBand(undefined, undefined)).toBe('none');
    expect(getHazeBand('', null)).toBe('none');
    expect(getHazeBand(undefined, Number.NaN)).toBe('none');
  });

  it('follows the NESO index, not grams, when there is one', () => {
    expect(getHazeBand('Moderate', 20)).toBe('moderate');
    expect(getHazeBand('low', 340)).toBe('none');
    expect(getHazeBand('HIGH', 0)).toBe('high');
    expect(getHazeBand('very high', 0)).toBe('very high');
  });

  it('falls back to the HUD cut-offs only when the index is missing', () => {
    expect(getHazeBand(undefined, 49)).toBe('none');
    expect(getHazeBand(undefined, 149)).toBe('none');
    expect(getHazeBand(undefined, 150)).toBe('moderate');
    expect(getHazeBand('', 250)).toBe('high');
    expect(getHazeBand('garbage', 350)).toBe('very high');
  });
});

describe('getHazeTokens', () => {
  it('returns nothing for none', () => {
    expect(getHazeTokens('none', 'midday')).toBeNull();
  });

  it('matches the Q5 day table and never exceeds 0.45', () => {
    const vh = getHazeTokens('very high', 'midday')!;
    expect(vh).toMatchObject({ tint: '#b39a7c', far: 0.42, back: 0.28, village: 0.14 });
    expect(vh.front).toBe(0.05);
    expect(vh.skyReach).toBe(0.55);
    for (const band of ['moderate', 'high', 'very high'] as const) {
      for (const tod of ['dawn', 'morning', 'midday', 'sunset', 'dusk', 'night']) {
        for (const fog of [false, true]) {
          const t = getHazeTokens(band, tod, fog)!;
          for (const v of [t.sky, t.far, t.back, t.village, t.front]) {
            expect(v).toBeLessThanOrEqual(HAZE_MAX_OPACITY);
            expect(v).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
    expect(getHazeTokens('moderate', 'midday')!.front).toBe(0);
  });

  it('after dark: low warm glow in the lowest 25% of the sky, hills at 60%', () => {
    const n = getHazeTokens('high', 'night')!;
    expect(n.tint).toBe('#8a6e5a');
    expect(n.sky).toBe(0.28);
    expect(n.skyReach).toBe(0.25);
    expect(n.back).toBeCloseTo(0.12, 3);
  });

  it('fog wins: sky wash is capped at 50%', () => {
    expect(getHazeTokens('very high', 'midday', true)!.sky).toBe(0.21);
  });
});

describe('sun, stars and smoke by band', () => {
  it('halo dims and stars thin as the band rises', () => {
    expect(SUN_HALO_FACTOR.moderate).toBe(0.8);
    expect(SUN_HALO_FACTOR['very high']).toBe(0.5);
    expect(STAR_HAZE_FACTOR.none).toBe(1);
    expect(STAR_HAZE_FACTOR['very high']).toBe(0);
  });

  it('smoke only at moderate and above, 3/4/5 puffs, never black', () => {
    expect(showsSmoke('none')).toBe(false);
    expect(showsSmoke('moderate')).toBe(true);
    expect(SMOKE_BY_BAND.moderate.puffs).toBe(3);
    expect(SMOKE_BY_BAND.high.puffs).toBe(4);
    expect(SMOKE_BY_BAND['very high'].puffs).toBe(5);
  });

  it('already zero carbon (e.g. Scotland at 0 g): no haze and a smokeless plant (BRIEF Q5, REDRAW-PLAN Q2)', () => {
    expect(getHazeBand('very low', 0)).toBe('none');
    expect(getHazeBand(undefined, 0)).toBe('none');
    expect(showsSmoke(getHazeBand('very low', 0))).toBe(false);
  });
});

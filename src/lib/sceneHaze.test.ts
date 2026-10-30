import { describe, expect, it } from 'vitest';
import {
  getHazeBand,
  getHazeTokens,
  HAZE_MAX_OPACITY,
  showsSmoke,
  SMOKE_BY_BAND,
  fitPlumeUnits,
  svgUnitsAbove,
  SMOKE_PLUME_UNITS,
  showsSmokeColumn,
  STAR_HAZE_FACTOR,
  SUN_HALO_FACTOR,
  SUN_DISC_OPACITY,
  getSkyBlend,
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
    // Design, 29 Oct 2026: warm grey-brown, ~15/30/45% over the lower 45% of the sky.
    expect(vh).toMatchObject({ tint: '#b9b2a0', sky: 0.45, far: 0.45, back: 0.3, village: 0.15 });
    expect(vh.front).toBe(0.05);
    expect(vh.skyReach).toBe(0.45);
    expect(getHazeTokens('high', 'midday')!.sky).toBe(0.3);
    expect(getHazeTokens('moderate', 'midday')!.sky).toBe(0.15);
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

  it('after dark: a lighter murk in the lowest 30% of the sky, hills at 60%', () => {
    const n = getHazeTokens('high', 'night')!;
    expect(n.tint).toBe('#9c9486');
    expect(n.sky).toBe(0.25);
    expect(n.skyReach).toBe(0.3);
    expect(getHazeTokens('very high', 'night')!.sky).toBeGreaterThan(0);
    expect(n.back).toBeCloseTo(0.12, 3);
  });

  it('fog wins: sky wash is capped at 50%', () => {
    expect(getHazeTokens('very high', 'midday', true)!.sky).toBe(0.225);
  });
});

describe('sun, stars and smoke by band', () => {
  it('halo dims and stars thin as the band rises', () => {
    expect(SUN_HALO_FACTOR.moderate).toBe(0.8);
    expect(SUN_HALO_FACTOR.high).toBe(0);
    expect(SUN_HALO_FACTOR['very high']).toBe(0);
    expect(SUN_DISC_OPACITY.high).toBe(0.7);
    expect(SUN_DISC_OPACITY['very high']).toBe(0.7);
    expect(SUN_DISC_OPACITY.moderate).toBe(1);
    expect(STAR_HAZE_FACTOR.none).toBe(1);
    expect(STAR_HAZE_FACTOR['very high']).toBe(0);
  });

  it('smoke only at moderate and above, 3/5/6 puffs, never black; a tall column at high and very high', () => {
    expect(showsSmoke('none')).toBe(false);
    expect(showsSmoke('moderate')).toBe(true);
    expect(SMOKE_BY_BAND.moderate.puffs).toBe(3);
    expect(SMOKE_BY_BAND.high.puffs).toBe(5);
    expect(SMOKE_BY_BAND['very high'].puffs).toBe(6);
    expect(SMOKE_BY_BAND['very high']).toMatchObject({ day: '#7d7a74', opacity: 0.6 });
    expect(SMOKE_BY_BAND.high.opacity).toBe(0.5);
    expect(SMOKE_PLUME_UNITS.high).toBeGreaterThanOrEqual(62);
    expect(SMOKE_PLUME_UNITS['very high']).toBeGreaterThanOrEqual(62);
    expect(showsSmokeColumn('moderate')).toBe(false);
    expect(showsSmokeColumn('high')).toBe(true);
    expect(showsSmokeColumn('none')).toBe(false);
  });

  it('already zero carbon (e.g. Scotland at 0 g): no haze and a smokeless plant (BRIEF Q5, REDRAW-PLAN Q2)', () => {
    expect(getHazeBand('very low', 0)).toBe('none');
    expect(getHazeBand(undefined, 0)).toBe('none');
    expect(showsSmoke(getHazeBand('very low', 0))).toBe(false);
  });
});

describe('sky blend by day (round 3)', () => {
  it('blends the whole sky 15% at high and 70% at very high, by day only', () => {
    expect(getSkyBlend('very high', 'midday')).toBe(0.7);
    expect(getSkyBlend('high', 'morning')).toBe(0.15);
    for (const b of ['none', 'moderate'] as const) expect(getSkyBlend(b, 'midday')).toBe(0);
    for (const t of ['dawn', 'sunset', 'dusk', 'night'])
      expect(getSkyBlend('very high', t)).toBe(0);
  });
});

describe('plume fits the sky (scene audit item 9)', () => {
  const vb = { x: 0, y: 30, w: 400, h: 120 };
  it('keeps the band height when there is room (390x844 scene)', () => {
    const sky = svgUnitsAbove(36, vb, 390, 400);
    expect(fitPlumeUnits(72, sky)).toBe(72);
  });
  it('caps the plume to 70% of the sky in a short landscape scene (720x540)', () => {
    const sky = svgUnitsAbove(36, vb, 720, 290)!;
    expect(sky).toBeGreaterThan(0);
    expect(fitPlumeUnits(72, sky)).toBeCloseTo(sky * 0.7, 5);
    expect(fitPlumeUnits(72, sky)).toBeLessThan(72);
  });
  it('falls back to the band height with no measurement', () => {
    expect(fitPlumeUnits(64, null)).toBe(64);
    expect(svgUnitsAbove(36, vb, 0, 0)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { getHillRidgeY } from '@/lib/sceneUtils';
import {
  buildTurbineLayout,
  scenePointToPx,
  TURBINE_HERO_SAFE_X,
  turbineHalfWidthUnits,
} from './turbineLayout';

describe('turbine layout', () => {
  const all = buildTurbineLayout(40);

  it('stands every mast on the ridge of its own hill', () => {
    for (const s of all) expect(s.groundY).toBe(getHillRidgeY(s.layer, s.x));
  });

  it('keeps every rotor out of the hero text and pill band at 320px and wider', () => {
    for (const s of all) {
      const half = turbineHalfWidthUnits(s.scale);
      const clear = s.x + half <= TURBINE_HERO_SAFE_X.min || s.x - half >= TURBINE_HERO_SAFE_X.max;
      expect(clear, `turbine at x ${s.x}`).toBe(true);
    }
  });

  it('maps scene units with the same xMidYMax meet fit as the hills', () => {
    // 720x200 is wider than 400:120, so the scene is letterboxed left and right.
    const p = scenePointToPx(200, 150, 720, 200);
    expect(p.unit).toBeCloseTo(200 / 120);
    expect(p.left).toBeCloseTo(360);
    expect(p.bottom).toBeCloseTo(0);
    // 390x400 is taller, so width rules and the scene sits on the bottom edge.
    const q = scenePointToPx(0, 30, 390, 400);
    expect(q.left).toBeCloseTo(0);
    expect(q.bottom).toBeCloseTo(120 * (390 / 400));
  });
});

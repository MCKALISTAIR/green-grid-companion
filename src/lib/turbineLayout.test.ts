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

describe('hero band is clear of scene props (#242 Design review)', () => {
  it('keeps the gas plant hall and stacks west of the band', async () => {
    const { gasPlantGeometry, GAS_PLANT_HALL } = await import('@/lib/gasPlant');
    const g = gasPlantGeometry();
    expect(g.x + GAS_PLANT_HALL.w).toBeLessThanOrEqual(TURBINE_HERO_SAFE_X.min);
  });

  it('keeps both biomass stacks out of the band', async () => {
    const { BIOMASS_STACK_X } = await import('@/components/scene/layers/SceneAdvancedLayer');
    for (const x of BIOMASS_STACK_X)
      expect(x + 4 <= TURBINE_HERO_SAFE_X.min || x - 4 >= TURBINE_HERO_SAFE_X.max).toBe(true);
  });

  it('matches the sheep safe zone', async () => {
    const { HERO_SAFE_X } = await import('@/lib/sheepLayout');
    expect(TURBINE_HERO_SAFE_X).toEqual(HERO_SAFE_X);
  });

  it('keeps EVERY tall prop out of the hero text column', async () => {
    const { gasPlantGeometry, GAS_PLANT_HALL } = await import('@/lib/gasPlant');
    const { BIOMASS_STACK_X } = await import('@/components/scene/layers/SceneAdvancedLayer');
    const { NUCLEAR_TOWER_X } = await import('@/components/scene/layers/SceneGenerationOverlay');
    const { OFFSHORE_WIND_X } = await import('@/components/scene/OffshoreWind');
    const { SHEEP_SPOTS } = await import('@/lib/sheepLayout');
    const g = gasPlantGeometry();
    // [name, left edge, right edge] in scene x.
    const props: [string, number, number][] = [
      ['gas plant', g.x, g.x + GAS_PLANT_HALL.w],
      ...BIOMASS_STACK_X.map((x): [string, number, number] => ['biomass stack', x - 4, x + 4]),
      ...NUCLEAR_TOWER_X.map((x): [string, number, number] => ['cooling tower', x - 10, x + 10]),
      // Offshore rotors are 25 units at scale 0.25-0.35, so about 9 units across.
      ...OFFSHORE_WIND_X.map((x): [string, number, number] => ['offshore turbine', x - 9, x + 9]),
      // Sheep: feet x, as in Sheep.test (the flock faces east of the band).
      ...SHEEP_SPOTS.map((s): [string, number, number] => ['sheep', s.x, s.x]),
    ];
    const { min, max } = TURBINE_HERO_SAFE_X;
    for (const [name, a, b] of props)
      expect(b <= min || a >= max, `${name} at ${a}-${b} overlaps ${min}-${max}`).toBe(true);
  });
});

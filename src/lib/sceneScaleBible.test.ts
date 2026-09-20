import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  CITY_GROUND_Y,
  CITY_SCALE,
  COUNTRYSIDE_SCALE,
  SCENE_VIEWBOX,
} from './sceneScaleBible';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('sceneScaleBible', () => {
  it('locks city landmark ratios used by art direction', () => {
    expect(SCENE_VIEWBOX.width).toBe(400);
    expect(CITY_SCALE.londonEye.radius).toBe(30);
    expect(CITY_SCALE.bess.width).toBe(22);
    expect(CITY_SCALE.bess.height).toBe(8);
    expect(CITY_SCALE.distantStack.height).toBe(22);
    expect(CITY_SCALE.car.bodyHeight).toBeLessThan(CITY_SCALE.bess.height);
  });

  it('BatteryStorageContainer reads BESS size from the bible', () => {
    const src = fs.readFileSync(path.join(root, 'components/scene/CityElements.tsx'), 'utf-8');
    expect(src).toContain('CITY_SCALE.bess');
    expect(src).toContain('CITY_GROUND_Y');
    expect(src).toMatch(/width=\{w\}/);
    expect(src).toMatch(/height=\{h\}/);
  });

  it('LondonEye defaults align with the bible', () => {
    const src = fs.readFileSync(path.join(root, 'components/scene/CityElements.tsx'), 'utf-8');
    expect(src).toContain(`radius = CITY_SCALE.londonEye.radius`);
    expect(src).toContain('CITY_GROUND_Y');
    expect(CITY_SCALE.londonEye.hubY).toBe(85);
  });

  it('countryside depth scales stay ordered', () => {
    expect(COUNTRYSIDE_SCALE.backTree.max).toBeLessThanOrEqual(COUNTRYSIDE_SCALE.midTree.min);
    expect(COUNTRYSIDE_SCALE.midTree.max).toBeLessThanOrEqual(COUNTRYSIDE_SCALE.frontTree.max);
    expect(COUNTRYSIDE_SCALE.midTree.min).toBeLessThan(COUNTRYSIDE_SCALE.frontTree.min);
    expect(COUNTRYSIDE_SCALE.turbine.frontMin).toBeGreaterThan(COUNTRYSIDE_SCALE.turbine.backMax);
  });
});

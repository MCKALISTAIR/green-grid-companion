import { describe, expect, it } from 'vitest';
import { getHillRidgeY } from '@/lib/sceneUtils';
import {
  FRONT_RIDGE_SPANS,
  GARDEN_FLOWER_SCALE,
  GARDEN_FLOWER_SINK,
  gardenBarePatches,
  gardenFlowerPositions,
} from '@/lib/gardenFlowers';

const clumps = (stage: number) => {
  const by = new Map<number, number>();
  for (const f of gardenFlowerPositions(stage)) by.set(f.clump, (by.get(f.clump) ?? 0) + 1);
  return [...by.values()];
};

describe('#221 garden flowers', () => {
  it('are about half scale', () => {
    expect(GARDEN_FLOWER_SCALE).toBe(0.5);
  });

  for (const stage of [1, 2, 3, 4]) {
    it(`stage ${stage}: every stem foot is on a front-ridge span`, () => {
      for (const p of gardenFlowerPositions(stage)) {
        const foot = p.y + 8 * GARDEN_FLOWER_SCALE;
        expect(foot - getHillRidgeY('front', p.x)).toBeCloseTo(GARDEN_FLOWER_SINK, 5);
        expect(FRONT_RIDGE_SPANS.some(([a, b]) => p.x >= a && p.x <= b)).toBe(true);
        expect(p.y).toBeLessThan(146);
      }
    });
  }

  it('lush: 10-12 clumps of 2-3 blooms, in 3 colours, on both spans', () => {
    const c = clumps(4);
    expect(c.length).toBeGreaterThanOrEqual(10);
    expect(c.length).toBeLessThanOrEqual(12);
    for (const n of c) expect([2, 3]).toContain(n);
    const fl = gardenFlowerPositions(4);
    expect(new Set(fl.map((f) => f.color)).size).toBe(3);
    for (const [a, b] of FRONT_RIDGE_SPANS) expect(fl.some((f) => f.x >= a && f.x <= b)).toBe(true);
  });

  it('thin: 1-2 single blooms and bare patches', () => {
    const c = clumps(1);
    expect(c.length).toBeGreaterThanOrEqual(1);
    expect(c.length).toBeLessThanOrEqual(2);
    for (const n of c) expect(n).toBe(1);
    expect(gardenBarePatches(1).length).toBeGreaterThan(0);
    expect(gardenBarePatches(4)).toEqual([]);
  });
});

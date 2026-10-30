import { describe, expect, it } from 'vitest';
import { getHillRidgeY } from '@/lib/sceneUtils';
import {
  GARDEN_FLOWER_SCALE,
  GARDEN_FLOWER_SINK,
  gardenFlowerPositions,
} from '@/lib/gardenFlowers';

describe('#221 garden flowers', () => {
  it('are about half scale', () => {
    expect(GARDEN_FLOWER_SCALE).toBe(0.5);
  });

  for (const stage of [1, 2, 4]) {
    it(`stage ${stage}: every stem foot sits on the front ridge`, () => {
      for (const p of gardenFlowerPositions(stage)) {
        const foot = p.y + 8 * GARDEN_FLOWER_SCALE;
        expect(foot - getHillRidgeY('front', p.x)).toBeCloseTo(GARDEN_FLOWER_SINK, 5);
        // The flower head stays inside the scene (viewBox bottom is y 150).
        expect(p.y).toBeLessThan(146);
      }
    });
  }

  it('grows in number with the stage', () => {
    expect(gardenFlowerPositions(1)).toHaveLength(2);
    expect(gardenFlowerPositions(2)).toHaveLength(4);
    expect(gardenFlowerPositions(4)).toHaveLength(7);
  });
});

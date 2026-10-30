import { getHillRidgeY } from '@/lib/sceneUtils';

/** #221: garden flowers at about half the bee-flower size. */
export const GARDEN_FLOWER_SCALE = 0.5;
/** Stem length in flower units (matches Flowers' FLOWER_STEM). */
const STEM = 8;
/** Sink the stem foot this far (scene units) into the ridge so it never floats. */
export const GARDEN_FLOWER_SINK = 0.5;

/**
 * Where the flowers stand (scene x). The front ridge drops below the scene floor
 * between about x 230 and 325, so no flower stands there.
 */
const XS: Record<'few' | 'some' | 'many', number[]> = {
  few: [90, 350],
  some: [40, 90, 150, 350],
  many: [20, 50, 80, 110, 150, 340, 375],
};

/** Flower head positions with each stem foot on the front-hill ridge. */
export function gardenFlowerPositions(stage: number): { x: number; y: number }[] {
  const xs = stage >= 4 ? XS.many : stage >= 2 ? XS.some : XS.few;
  return xs.map((x) => ({
    x,
    y: getHillRidgeY('front', x) - STEM * GARDEN_FLOWER_SCALE + GARDEN_FLOWER_SINK,
  }));
}

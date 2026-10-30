import { getHillRidgeY } from '@/lib/sceneUtils';

/** #221: garden flowers at about half the bee-flower size. */
export const GARDEN_FLOWER_SCALE = 0.5;
/** Stem length in flower units (matches Flowers' FLOWER_STEM). */
const STEM = 8;
/** Sink the stem foot this far (scene units) into the ridge so it never floats. */
export const GARDEN_FLOWER_SINK = 0.5;
/** The garden's three bloom colours (pink, yellow, violet). */
export const GARDEN_FLOWER_COLOURS = ['#ec4899', '#fbbf24', '#a855f7'] as const;

/**
 * The two front-ridge spans that are inside the scene. The ridge drops below the
 * scene floor between about x 230 and 325, so nothing stands there.
 */
export const FRONT_RIDGE_SPANS = [
  [10, 222],
  [330, 394],
] as const;

/** Clump centres (scene x) across both spans; lush uses all 11. */
const CLUMP_X = [14, 34, 58, 82, 104, 128, 152, 176, 204, 342, 386];
/** Blooms per clump at lush (2-3 each). */
const CLUMP_SIZE = [3, 2, 3, 2, 3, 2, 3, 2, 3, 3, 2];
/** Bloom offsets inside a clump (scene units). */
const OFFSETS = [[0], [-2, 2], [-2.8, 0, 2.8]];

/** Which clumps each stage draws and how many blooms each gets (capped). */
function plan(stage: number): { x: number; n: number }[] {
  if (stage >= 4) return CLUMP_X.map((x, i) => ({ x, n: CLUMP_SIZE[i] }));
  if (stage >= 3) return [14, 58, 104, 152, 204, 340, 372].map((x) => ({ x, n: 2 }));
  if (stage >= 2) return [34, 128, 204, 356].map((x, i) => ({ x, n: i % 2 ? 1 : 2 }));
  if (stage >= 1)
    return [
      { x: 82, n: 1 },
      { x: 362, n: 1 },
    ];
  return [];
}

export interface GardenFlower {
  x: number;
  y: number;
  color: string;
  clump: number;
}

const headY = (x: number) =>
  getHillRidgeY('front', x) - STEM * GARDEN_FLOWER_SCALE + GARDEN_FLOWER_SINK;

/** Flower heads, grouped in clumps, with each stem foot on the front-hill ridge. */
export function gardenFlowerPositions(stage: number): GardenFlower[] {
  return plan(stage).flatMap(({ x, n }, clump) =>
    OFFSETS[n - 1].map((dx) => ({
      x: x + dx,
      y: headY(x + dx),
      color: GARDEN_FLOWER_COLOURS[clump % GARDEN_FLOWER_COLOURS.length],
      clump,
    })),
  );
}

/** Thin weeks: bare-earth patches on the ridge (scene x centres). */
export function gardenBarePatches(stage: number): { x: number; y: number }[] {
  if (stage > 1) return [];
  return [40, 150, 200, 345].map((x) => ({ x, y: getHillRidgeY('front', x) - 1 }));
}

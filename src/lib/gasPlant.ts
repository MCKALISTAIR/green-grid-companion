/**
 * PR-2b: gas plant (CCGT) tokens and geometry, shared by GasPlant and its tests.
 * Drawn in the countryside SVG space (viewBox 0 30 400 120).
 */
import { getHillRidgeY } from '@/lib/sceneUtils';

/** Q7 prop tokens (day), plus Design-default dark tokens for dusk and night. */
export const GAS_PLANT_TOKENS = {
  day: { light: '#d9dde2', shade: '#aab1ba', band: '#9aa1ab' },
  night: { light: '#5d6577', shade: '#454c5d', band: '#737b8c' },
} as const;
export const GAS_PLANT_AVIATION_RED = '#e5484d';

/** Left edge of the turbine hall, SVG units. Plant spans x 98-138. */
export const GAS_PLANT_X = 98;
export const GAS_PLANT_HALL = { w: 40, h: 12 };
export const GAS_PLANT_BOILER = { w: 14, h: 18 };
export const GAS_PLANT_STACK = { w: 3, h: 34 };

export function gasPlantGeometry(x = GAS_PLANT_X) {
  // Grounded on the back ridge: base at the lowest ridge point under the footprint
  // + 1 unit, so no edge floats (BRIEF §2).
  const xs = [x, x + GAS_PLANT_HALL.w / 2, x + GAS_PLANT_HALL.w];
  const baseY = Math.max(...xs.map((sx) => getHillRidgeY('back', sx))) + 1;
  const boilerX = x + GAS_PLANT_HALL.w - GAS_PLANT_BOILER.w;
  const stacks = [x + 19, x + 24.5].map((sx) => ({ x: sx, top: baseY - GAS_PLANT_STACK.h }));
  return { x, baseY, boilerX, stacks, width: GAS_PLANT_HALL.w };
}

/**
 * Scene audit item 4: the city far-layer plant. The same art as the countryside
 * plant, scaled down and seated on the city far ground line (y 95 in the city
 * viewBox 0 0 400 150, where the old distant stack stood), toward the east edge.
 */
export const CITY_GAS_PLANT = { x: 332, groundY: 95, scale: 0.7 } as const;
export function cityGasPlantTransform() {
  const { baseY } = gasPlantGeometry(GAS_PLANT_X);
  const { x, groundY, scale } = CITY_GAS_PLANT;
  const dx = x - GAS_PLANT_X * scale;
  const dy = groundY - baseY * scale;
  return `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${scale})`;
}

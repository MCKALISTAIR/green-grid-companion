import { getHillRidgeY } from '@/lib/sceneUtils';

export type TurbineLayer = 'back' | 'mid' | 'front';

export interface TurbineSlot {
  /** Scene x in the countryside viewBox (0 to 400). */
  x: number;
  scale: number;
  z: number;
  layer: TurbineLayer;
  /** Scene y of the ridge under the mast, in the same viewBox. */
  groundY: number;
}

/**
 * The hero text and renewable pill sit over scene x 112 to 288 at every size
 * (#239 measures this for the sheep). Turbines are tall enough to reach the
 * hero from any ridge, so no mast or rotor may sit inside this band.
 */
export const TURBINE_HERO_SAFE_X = { min: 112, max: 288 } as const;

/** Rotor radius in scene units at the narrowest phone (320px, 0.8 px per unit). */
export function turbineHalfWidthUnits(scale: number): number {
  return (48 * scale) / 2 / 0.8;
}

const TURBINE_SLOT_DEFS: Array<Omit<TurbineSlot, 'groundY'>> = [
  // Turbines must visually dominate trees (front trees ~0.5). Front slots ≥0.95.
  { x: 16, scale: 0.42, z: 1, layer: 'back' },
  { x: 34, scale: 0.38, z: 1, layer: 'back' },
  { x: 384, scale: 0.4, z: 1, layer: 'back' },
  { x: 345, scale: 0.68, z: 15, layer: 'mid' },
  { x: 372, scale: 0.64, z: 15, layer: 'mid' },
  { x: 62, scale: 0.7, z: 15, layer: 'mid' },
  { x: 44, scale: 1.05, z: 25, layer: 'front' },
  { x: 76, scale: 0.98, z: 25, layer: 'front' },
];

/** Build wind-driven turbine placements whose masts stand on the hill they belong to. */
export function buildTurbineLayout(windPercentage: number): TurbineSlot[] {
  const allSlots: TurbineSlot[] = TURBINE_SLOT_DEFS.map((slot) => ({
    ...slot,
    groundY: getHillRidgeY(slot.layer, slot.x),
  }));

  let count: number;
  if (windPercentage <= 0) count = 2;
  else if (windPercentage < 5) count = 2;
  else if (windPercentage < 15) count = Math.min(4, 2 + Math.floor(windPercentage / 5));
  else if (windPercentage < 25) count = Math.min(6, 4 + Math.floor((windPercentage - 15) / 5));
  else count = allSlots.length;

  // Prefer one turbine from each depth layer, then fill remaining slots.
  const byLayer = {
    front: allSlots.filter((s) => s.layer === 'front'),
    mid: allSlots.filter((s) => s.layer === 'mid'),
    back: allSlots.filter((s) => s.layer === 'back'),
  };

  const seeded: TurbineSlot[] = [];
  if (count >= 1 && byLayer.front[0]) seeded.push(byLayer.front[0]);
  if (count >= 2 && byLayer.mid[0]) seeded.push(byLayer.mid[0]);
  if (count >= 3 && byLayer.back[0]) seeded.push(byLayer.back[0]);

  const remaining = allSlots.filter((s) => !seeded.includes(s));
  return [...seeded, ...remaining].slice(0, count);
}

/** Countryside viewBox `0 30 400 120`, drawn with xMidYMax meet. */
const VB = { x: 0, y: 30, w: 400, h: 120 };

/**
 * Where scene point (x, y) lands in a container of width by height px, using
 * the same xMidYMax meet fit as the landscape SVGs, as CSS left and bottom px.
 */
export function scenePointToPx(
  x: number,
  y: number,
  width: number,
  height: number,
): { left: number; bottom: number; unit: number } {
  const unit = Math.min(width / VB.w, height / VB.h);
  const offsetX = (width - VB.w * unit) / 2;
  return { left: offsetX + (x - VB.x) * unit, bottom: (VB.y + VB.h - y) * unit, unit };
}

/** The mast foot is 4 of 96 px above the turbine box bottom (WindTurbine viewBox). */
export const TURBINE_FOOT_PX = 4;
/** Sink the foot into the ridge so it reads as planted. */
export const TURBINE_SINK_PX = 1;

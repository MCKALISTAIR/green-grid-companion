import { getTurbineBottomPct } from '@/lib/sceneUtils';

export type TurbineLayer = 'back' | 'mid' | 'front';

export interface TurbineSlot {
  left: number;
  scale: number;
  z: number;
  layer: TurbineLayer;
  bottom: number;
}

const TURBINE_SLOT_DEFS: Array<Omit<TurbineSlot, 'bottom'>> = [
  // Turbines must visually dominate trees (front trees ~0.5). Front slots ≥0.95.
  { left: 18, scale: 0.42, z: 1, layer: 'back' },
  { left: 25, scale: 0.38, z: 1, layer: 'back' },
  { left: 92, scale: 0.4, z: 1, layer: 'back' },
  { left: 50, scale: 0.68, z: 15, layer: 'mid' },
  { left: 60, scale: 0.64, z: 15, layer: 'mid' },
  { left: 72, scale: 0.7, z: 15, layer: 'mid' },
  { left: 30, scale: 1.05, z: 25, layer: 'front' },
  { left: 45, scale: 0.98, z: 25, layer: 'front' },
];

/** Build wind-driven turbine placements that sit on hill ridge lines. */
export function buildTurbineLayout(windPercentage: number): TurbineSlot[] {
  const CONTAINER_PCT = 100;
  const allSlots: TurbineSlot[] = TURBINE_SLOT_DEFS.map((slot) => ({
    ...slot,
    bottom: getTurbineBottomPct(slot.layer, slot.left, CONTAINER_PCT, -1),
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

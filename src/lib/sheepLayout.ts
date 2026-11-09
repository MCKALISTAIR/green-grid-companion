import { getHillRidgeY } from '@/lib/sceneUtils';

export const ART = { w: 40, feetY: 30, feetX: 20 } as const;
export const SHEEP_SINK = 0.5;
export const SHEEP_WIDTH = 13;
export const SHEEP_MIN_X = 150;
export const HERO_SAFE_X = { min: 112, max: 288 } as const;
export const SHEEP_SPOTS = [292, 305, 318].map((x) => ({
  x,
  y: getHillRidgeY('mid', x) + SHEEP_SINK,
}));

export function sheepTransform(x: number, y: number, width = SHEEP_WIDTH) {
  const s = width / ART.w;
  return `translate(${(x - ART.feetX * s).toFixed(2)} ${(y - ART.feetY * s).toFixed(2)}) scale(${s.toFixed(4)})`;
}

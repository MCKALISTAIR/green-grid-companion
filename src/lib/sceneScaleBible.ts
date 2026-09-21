/**
 * Scene scale bible — one chibi-realistic dialect for landscape props.
 * Art direction: docs/ART_DIRECTION.md (register test).
 * Visual QA: docs/SCENE_VISUAL_QA.md
 *
 * Units are SVG user units inside the standard 400×150 scene viewBox
 * unless a component uses a different local coordinate system.
 */

export const SCENE_VIEWBOX = { width: 400, height: 150 } as const;

/**
 * Aspect policy for full-bleed scene SVGs.
 * - Silhouette layers (hills, skyline, props): uniform scale, bottom-anchored,
 *   crop overflow — never stretch. Fixes the "crammed/stretched" look on phone
 *   50vh heroes and ultrawide desktops.
 * - Wash layers (sky fills, mist, smog gradients, grass strips): stretch OK.
 */
export const SCENE_SILHOUETTE_ASPECT = 'xMidYMax slice' as const;
export const SCENE_WASH_ASPECT = 'none' as const;

/** Shared road / ground line for city props. */
export const CITY_GROUND_Y = 138;

export const CITY_SCALE = {
  groundY: CITY_GROUND_Y,
  londonEye: {
    /** Wheel radius (diameter ≈ 60u — dominant city landmark). */
    radius: 30,
    hubY: 85,
    plinthHalfWidth: 22,
    plinthHeight: 4,
  },
  bess: {
    width: 22,
    height: 8,
    groundY: CITY_GROUND_Y,
  },
  distantStack: {
    width: 2,
    height: 22,
  },
  car: {
    bodyWidth: 14,
    bodyHeight: 5,
    cabinWidth: 8,
    cabinHeight: 3,
  },
  bus: {
    width: 24,
    height: 8,
  },
  pigeon: {
    /** framer scaleX/scaleY baseline */
    baseScale: 0.35,
  },
  urbanTree: {
    minScale: 0.4,
    maxScale: 1.0,
  },
} as const;

/** Countryside pine scales by depth layer (Landscape.tsx). */
export const COUNTRYSIDE_SCALE = {
  backTree: { min: 0.15, max: 0.28 },
  midTree: { min: 0.3, max: 0.45 },
  frontTree: { min: 0.4, max: 0.55 },
  sheep: { min: 0.5, max: 0.55 },
  cottage: { scale: 0.78 },
  turbine: {
    backMax: 0.5,
    frontMin: 0.9,
  },
} as const;

/** Coastal prop scale guards. */
export const COASTAL_SCALE = {
  seagull: { min: 0.7, max: 1.1 },
  rockPoolAccent: 0.4,
} as const;

export type CityScaleKey = keyof typeof CITY_SCALE;

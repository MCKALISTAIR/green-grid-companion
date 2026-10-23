import type { CleanlinessBand } from '@/hooks/useCleanlinessBand';

/**
 * City one-hero emphasis — presence first, then hierarchy.
 *
 * Quiet ≠ barren: keep skyline mass, floor non-hero opacity so props
 * still read, and leave one micro-life cue on the road.
 */
export interface CityHeroEmphasis {
  /**
   * Focal prop for this band (matches SceneHeroSpotlight). 'landmark' is the
   * city's very-clean hero: the London Eye, Edinburgh Castle (rim-lit, never
   * demoted or scaled) or the generic church spire (Design brief Q9, PR-B1).
   */
  hero: 'landmark' | 'skyline' | 'bess' | 'distant-stack' | 'smog';
  /** London Eye opacity (the only landmark that is demoted/scaled). */
  landmarkOpacity: number;
  bessOpacity: number;
  /** Scale bump when this prop is the hero (>1) or slight shrink when demoted. */
  landmarkScale: number;
  bessScale: number;
  /** Mid/back skyline relative opacity (clean band lifts the skyline). */
  skylineOpacity: number;
  /** Foreground building row — stay solid enough to read as a city. */
  frontOpacity: number;
  /** Road vehicles; at least 1 when we want "alive" (never a jam). */
  trafficCount: number;
  pigeonCount: number;
  showCrane: boolean;
  showBus: boolean;
  /** Periodic Tube flash across the road (diegetic playful beat). */
  showTubeFlash: boolean;
}

const CITY_HERO_EMPHASIS: Record<CleanlinessBand, CityHeroEmphasis> = {
  'very-clean': {
    hero: 'landmark',
    landmarkOpacity: 1,
    bessOpacity: 0.38,
    landmarkScale: 1.08,
    bessScale: 0.92,
    skylineOpacity: 0.78,
    frontOpacity: 0.88,
    trafficCount: 1,
    pigeonCount: 1,
    showCrane: false,
    showBus: false,
    showTubeFlash: true,
  },
  clean: {
    hero: 'skyline',
    landmarkOpacity: 0.42,
    bessOpacity: 0.38,
    landmarkScale: 0.94,
    bessScale: 0.94,
    skylineOpacity: 1,
    frontOpacity: 1,
    trafficCount: 2,
    pigeonCount: 0,
    showCrane: false,
    showBus: false,
    showTubeFlash: true,
  },
  moderate: {
    hero: 'bess',
    landmarkOpacity: 0.4,
    bessOpacity: 1,
    landmarkScale: 0.94,
    bessScale: 1.12,
    skylineOpacity: 0.8,
    frontOpacity: 0.86,
    trafficCount: 1,
    pigeonCount: 0,
    showCrane: false,
    showBus: false,
    showTubeFlash: true,
  },
  dirty: {
    hero: 'distant-stack',
    landmarkOpacity: 0.36,
    bessOpacity: 0.36,
    landmarkScale: 0.92,
    bessScale: 0.92,
    skylineOpacity: 0.88,
    frontOpacity: 0.92,
    trafficCount: 2,
    pigeonCount: 0,
    showCrane: false,
    showBus: true,
    showTubeFlash: true,
  },
  'very-dirty': {
    hero: 'smog',
    landmarkOpacity: 0.35,
    bessOpacity: 0.32,
    landmarkScale: 0.9,
    bessScale: 0.9,
    skylineOpacity: 0.72,
    frontOpacity: 0.8,
    trafficCount: 2,
    pigeonCount: 0,
    showCrane: true,
    showBus: true,
    showTubeFlash: false,
  },
};

export function getCityHeroEmphasis(band: CleanlinessBand): CityHeroEmphasis {
  return CITY_HERO_EMPHASIS[band];
}

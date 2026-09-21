import type { CleanlinessBand } from '@/hooks/useCleanlinessBand';

/**
 * City one-hero emphasis — demote supporting props so the spotlighted
 * landmark reads first (art direction: one hero per intensity band).
 *
 * Opacity multiplies onto the prop; trafficCount caps road clutter.
 */
export interface CityHeroEmphasis {
  /** Focal prop for this band (matches SceneHeroSpotlight). */
  hero: 'london-eye' | 'skyline' | 'bess' | 'distant-stack' | 'smog';
  eyeOpacity: number;
  bessOpacity: number;
  /** Mid/back skyline relative opacity (clean band lifts the skyline). */
  skylineOpacity: number;
  trafficCount: number;
  showPigeons: boolean;
  showCrane: boolean;
}

const CITY_HERO_EMPHASIS: Record<CleanlinessBand, CityHeroEmphasis> = {
  'very-clean': {
    hero: 'london-eye',
    eyeOpacity: 1,
    bessOpacity: 0.32,
    skylineOpacity: 0.72,
    trafficCount: 2,
    showPigeons: true,
    showCrane: false,
  },
  clean: {
    hero: 'skyline',
    eyeOpacity: 0.48,
    bessOpacity: 0.38,
    skylineOpacity: 1,
    trafficCount: 3,
    showPigeons: true,
    showCrane: false,
  },
  moderate: {
    hero: 'bess',
    eyeOpacity: 0.4,
    bessOpacity: 1,
    skylineOpacity: 0.78,
    trafficCount: 3,
    showPigeons: false,
    showCrane: false,
  },
  dirty: {
    hero: 'distant-stack',
    eyeOpacity: 0.34,
    bessOpacity: 0.36,
    skylineOpacity: 0.7,
    trafficCount: 4,
    showPigeons: false,
    showCrane: true,
  },
  'very-dirty': {
    hero: 'smog',
    eyeOpacity: 0.22,
    bessOpacity: 0.28,
    skylineOpacity: 0.55,
    trafficCount: 5,
    showPigeons: false,
    showCrane: true,
  },
};

export function getCityHeroEmphasis(band: CleanlinessBand): CityHeroEmphasis {
  return CITY_HERO_EMPHASIS[band];
}

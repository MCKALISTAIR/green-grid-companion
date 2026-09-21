import type { CleanlinessBand } from '@/hooks/useCleanlinessBand';

/**
 * City one-hero emphasis — demote supporting props so the spotlighted
 * landmark reads first (art direction: one hero per intensity band).
 *
 * UX bar: name the focal prop in under one second. Non-heroes should
 * nearly ghost; traffic/wildlife should often be off entirely.
 */
export interface CityHeroEmphasis {
  /** Focal prop for this band (matches SceneHeroSpotlight). */
  hero: 'london-eye' | 'skyline' | 'bess' | 'distant-stack' | 'smog';
  eyeOpacity: number;
  bessOpacity: number;
  /** Mid/back skyline relative opacity (clean band lifts the skyline). */
  skylineOpacity: number;
  /** Foreground building row — drop when Eye/BESS need to pop. */
  frontOpacity: number;
  /** Road vehicles; 0 = empty road (preferred when a landmark is hero). */
  trafficCount: number;
  showPigeons: boolean;
  showCrane: boolean;
  showBus: boolean;
}

const CITY_HERO_EMPHASIS: Record<CleanlinessBand, CityHeroEmphasis> = {
  'very-clean': {
    hero: 'london-eye',
    eyeOpacity: 1,
    bessOpacity: 0.1,
    skylineOpacity: 0.42,
    frontOpacity: 0.55,
    trafficCount: 0,
    showPigeons: true,
    showCrane: false,
    showBus: false,
  },
  clean: {
    hero: 'skyline',
    eyeOpacity: 0.16,
    bessOpacity: 0.12,
    skylineOpacity: 1,
    frontOpacity: 0.92,
    trafficCount: 2,
    showPigeons: false,
    showCrane: false,
    showBus: false,
  },
  moderate: {
    hero: 'bess',
    eyeOpacity: 0.12,
    bessOpacity: 1,
    skylineOpacity: 0.48,
    frontOpacity: 0.5,
    trafficCount: 0,
    showPigeons: false,
    showCrane: false,
    showBus: false,
  },
  dirty: {
    hero: 'distant-stack',
    eyeOpacity: 0.1,
    bessOpacity: 0.1,
    skylineOpacity: 0.58,
    frontOpacity: 0.62,
    trafficCount: 2,
    showPigeons: false,
    showCrane: false,
    showBus: true,
  },
  'very-dirty': {
    hero: 'smog',
    eyeOpacity: 0.08,
    bessOpacity: 0.08,
    skylineOpacity: 0.4,
    frontOpacity: 0.45,
    trafficCount: 3,
    showPigeons: false,
    showCrane: true,
    showBus: true,
  },
};

export function getCityHeroEmphasis(band: CleanlinessBand): CityHeroEmphasis {
  return CITY_HERO_EMPHASIS[band];
}

/** Hotspot affordance: only the focal prop (or near-hero) should invite taps. */
export function isCityHotspotActive(
  hero: CityHeroEmphasis['hero'],
  hotspot: 'london-eye' | 'bess' | 'distant-stack' | 'ev-charger',
  emphasis: CityHeroEmphasis,
): boolean {
  switch (hotspot) {
    case 'london-eye':
      return hero === 'london-eye' || emphasis.eyeOpacity >= 0.5;
    case 'bess':
      return hero === 'bess' || emphasis.bessOpacity >= 0.5;
    case 'distant-stack':
      return hero === 'distant-stack' || hero === 'smog';
    case 'ev-charger':
      return hero === 'london-eye' || hero === 'bess';
    default:
      return false;
  }
}

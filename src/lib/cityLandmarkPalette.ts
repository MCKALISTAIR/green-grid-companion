import type { CleanlinessBand } from '@/hooks/useCleanlinessBand';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { WeatherData } from '@/hooks/useWeatherData';
import { MOOD, UNKNOWN_WEATHER_PALETTE, unknownWeatherTone } from '@/lib/artPalette';

/**
 * PR-B1 city skyline art (Design brief §11): colours for the Edinburgh Castle
 * far layer and the very-clean landmark light (castle or church spire).
 *
 * All flat fills. No CSS or SVG filters, no blur, no animation: weather and
 * haze are pre-mixed into the fill colours here.
 */

/** Weather as the city art sees it. Only real Open-Meteo flags; unknown keeps #179's neutral grade. */
export type CityWeatherState = 'clear' | 'overcast' | 'rain' | 'storm' | 'fog' | 'snow' | 'unknown';

export function cityWeatherState(
  weatherKnown: boolean,
  weather?: Pick<
    WeatherData,
    'cloudCover' | 'isRaining' | 'isSnowing' | 'isFoggy' | 'isThunderstorm'
  > | null,
): CityWeatherState {
  if (!weatherKnown || !weather) return 'unknown';
  if (weather.isThunderstorm) return 'storm';
  if (weather.isFoggy) return 'fog';
  if (weather.isSnowing) return 'snow';
  if (weather.isRaining) return 'rain';
  if (weather.cloudCover > 70) return 'overcast';
  return 'clear';
}

/** Far-layer tokens per time of day (brief §11.2 colour table). */
export const EDINBURGH_CASTLE_TOKENS: Record<
  TimeOfDay,
  { rock: string; walls: string; roofs: string }
> = {
  morning: { rock: '#7f9aa6', walls: '#a9b9c2', roofs: '#6f8590' },
  midday: { rock: '#86a0aa', walls: '#b4c3cb', roofs: '#74899a' },
  afternoon: { rock: '#8d9c9c', walls: '#c1c3bb', roofs: '#7a8686' },
  // Design review of #190 (23 Oct) asked for #5a3f4f / #6b4a52 / #4a3442; those
  // pixel-measure 1.496:1 at 390 on the clear sunset sky, so they are L -3.
  sunset: { rock: '#513947', walls: '#62444b', roofs: '#412e3a' },
  dawn: { rock: '#5d5f86', walls: '#8a85a6', roofs: '#4b4d72' },
  dusk: { rock: '#3f4b7a', walls: '#56618f', roofs: '#343f6c' },
  night: { rock: '#26305a', walls: '#5a5470', roofs: '#1f284e' },
};

/**
 * After-dark overrides. The brief's dusk and night tokens land within 1.0-1.3:1
 * of the sky the app actually draws (the purple dusk/night sky plus the scene's
 * night grade), below the brief's own 1.5:1 silhouette rule. At dusk a deep
 * silhouette clears it easily against the warm horizon; at night the scene
 * grade lifts every dark fill, so even near-black only reaches ~1.4:1. Instead
 * the night castle is softly lit in cool stone (as the real castle is floodlit
 * every night), and the very-clean hero switches to a warm floodlight.
 */
export const EDINBURGH_CASTLE_AFTER_DARK: Record<
  'dusk' | 'night',
  { rock: string; walls: string; roofs: string }
> = {
  dusk: { rock: '#1b1f38', walls: '#2b2f4d', roofs: '#161a33' },
  night: { rock: '#737aa0', walls: '#9b97b2', roofs: '#7a7aa0' },
};
export const EDINBURGH_CASTLE_FLOODLIT = { rock: '#5f6795', walls: '#c9a476', roofs: '#8c7c88' };

const SYNTHWAVE_CASTLE = { rock: '#240046', walls: '#5a189a', roofs: '#3c096c' };

export const LANDMARK_RIM_SUN = '#ffb36b';
export const LANDMARK_WINDOW_LIT = '#ffd27a';
export const LANDMARK_SNOW_CAP = '#eef2f6';
/** Existing scene sky targets (sceneUtils getSkyParams): fog and storm horizons. */
const FOG_SKY = '#d9d9d9'; // hsl(0 0% 85%)
const STORM_SKY = '#4f4370'; // hsl(250 25% 35%)
/** Storm lightness drop (brief §11.2). */
const STORM_DARKEN_L = 16;
/**
 * Lightness drop under cloud (overcast, rain, snow) outside dusk. Design asked
 * for the storm-style 16; re-measured, that still left daytime cloud at
 * 1.28-1.41:1 and snow at 1.02-1.18:1, so it is 26 (pixel-measured, see
 * e2e/castle-contrast-b1.spec.ts).
 */
const CLOUD_DARKEN_L = 26;
/**
 * Daytime snow goes further: at 320 the snow ground hides most of the dark rock,
 * leaving the pale walls on the grey sky (1.28-1.42:1 at 26).
 */
const DAY_SNOW_DARKEN_L = 34;
/**
 * BH-117: since the castle stands in front of the cloud bank, a daytime storm
 * castle sits on the mid-grey bank, not the storm sky, and measured 1.47-1.49:1
 * at 390 with the storm's 16. It takes a further L drop after the storm mix.
 */
export const DAY_STORM_EXTRA_DARKEN_L = 4;

/**
 * BH-117: after dark on the cloud bank the lit stone is lifted toward this pale
 * stone (pixel-measured, e2e/castle-contrast-b1.spec.ts). Snow lifts further: at
 * 320 the snow ground veils the rock, leaving the walls on the grey sky.
 */
export const NIGHT_BANK_STONE = '#e9e6f2';
export const NIGHT_BANK_LIFT = 0.2;
export const NIGHT_BANK_SNOW_LIFT = 0.75;

/** Far-layer haze by NESO band (brief §11.2 / Q5). None at very low or low. */
const FAR_HAZE: Record<string, number> = { moderate: 0.22, high: 0.32, 'very high': 0.42 };

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/** Linear sRGB-space mix: t = 0 keeps `a`, t = 1 gives `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * t) as [number, number, number]);
}

/** Lower HSL lightness by `points` (0-100 scale). */
export function darkenHex(hex: string, points: number): string {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l2 = Math.max(0, l - points / 100);
  const c = (1 - Math.abs(2 * l2 - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l2 - c / 2;
  const [r1, g1, b1] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return rgbToHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]);
}

/** Relative luminance contrast ratio (WCAG). */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = hexToRgb(hex).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SUN_TIMES: TimeOfDay[] = ['dawn', 'morning', 'midday', 'afternoon', 'sunset'];

export interface LandmarkLight {
  /** Warm rim along the roofline (sun-lit by day, floodlit at night), or none. */
  rim: { color: string; opacity: number } | null;
  /** True when the landmark's extra windows are lit (very-clean hero after dark or under cloud). */
  heroWindows: boolean;
}

/**
 * The very-clean landmark light (Design, PR-B1 decisions 23 Oct 11:04):
 * Edinburgh's castle and the generic church spire get a warm rim light, or lit
 * windows when there is no sun to rim them. Static and decorative only; it is
 * shown only while the NESO band is very low (`heroLit`).
 */
export function getLandmarkLight({
  timeOfDay,
  weather,
  heroLit,
  synthwaveMode = false,
}: {
  timeOfDay: TimeOfDay;
  weather: CityWeatherState;
  heroLit: boolean;
  synthwaveMode?: boolean;
}): LandmarkLight {
  if (synthwaveMode || weather === 'fog') return { rim: null, heroWindows: false };
  const sunUp = weather === 'clear' && SUN_TIMES.includes(timeOfDay);
  if (heroLit) {
    if (sunUp) return { rim: { color: LANDMARK_RIM_SUN, opacity: 0.6 }, heroWindows: false };
    // After dark (or no sun under cloud): floodlit edge plus lit windows.
    return { rim: { color: LANDMARK_WINDOW_LIT, opacity: 0.45 }, heroWindows: true };
  }
  // Not the hero: only the brief's sunset sun-side rim.
  if (sunUp && timeOfDay === 'sunset') {
    return { rim: { color: LANDMARK_RIM_SUN, opacity: 0.6 }, heroWindows: false };
  }
  return { rim: null, heroWindows: false };
}

export interface EdinburghCastleColours {
  rock: string;
  rockShade: string;
  walls: string;
  roofs: string;
  /** Number of lit windows, 0-5 (brief: 3-5 static lit windows at dusk and night). */
  litWindows: number;
  windowColor: string;
  rim: LandmarkLight['rim'];
  snowCap: boolean;
  wetSheen: boolean;
}

/**
 * Castle colours for one time of day, weather and NESO band (brief §11.2):
 * overcast mixes 25% toward the horizon, rain 35% plus a wall-walk sheen,
 * storm darkens L by 16 then mixes 20% toward the storm sky, fog mixes 70%
 * toward the fog sky and hides the windows, snow adds ledge caps, unknown
 * weather takes #179's neutral overcast grade only. Haze (moderate and above)
 * mixes the far layer toward the mood haze, so the castle softens first.
 */
export function getEdinburghCastleColours({
  timeOfDay,
  weather,
  nesoIndex,
  heroLit,
  synthwaveMode = false,
}: {
  timeOfDay: TimeOfDay;
  weather: CityWeatherState;
  nesoIndex?: string;
  heroLit: boolean;
  synthwaveMode?: boolean;
}): EdinburghCastleColours {
  const afterDark = timeOfDay === 'dusk' || timeOfDay === 'night';
  const floodlit = afterDark && heroLit && weather !== 'fog';
  // Design review of #190: a clear dusk sky is as dark as the castle's dusk
  // silhouette at the horizon (measured 1.24:1), so clear dusk uses the night
  // lit-stone set.
  // BH-117: overcast, rain, snow and storm draw the night-tone cloud bank
  // directly behind the castle (it stands in front of the bank). The dark
  // silhouette set measured 1.08-1.26:1 on it and can't get darker, so after dark
  // under the bank the castle is the lit-stone set, like clear dusk, and skips
  // the under-cloud darkening below.
  const onNightBank =
    afterDark &&
    (weather === 'overcast' || weather === 'rain' || weather === 'snow' || weather === 'storm');
  const afterDarkSet =
    (timeOfDay === 'dusk' && weather === 'clear') || onNightBank
      ? 'night'
      : (timeOfDay as 'dusk' | 'night');
  const base = synthwaveMode
    ? SYNTHWAVE_CASTLE
    : floodlit
      ? EDINBURGH_CASTLE_FLOODLIT
      : afterDark
        ? EDINBURGH_CASTLE_AFTER_DARK[afterDarkSet]
        : (EDINBURGH_CASTLE_TOKENS[timeOfDay] ?? EDINBURGH_CASTLE_TOKENS.midday);
  let { rock, walls, roofs } = base;

  if (!synthwaveMode) {
    const horizon = UNKNOWN_WEATHER_PALETTE[unknownWeatherTone(timeOfDay)].sky[1];
    const mixAll = (target: string, t: number) => {
      rock = mixHex(rock, target, t);
      walls = mixHex(walls, target, t);
      roofs = mixHex(roofs, target, t);
    };
    const darkenAll = (points: number) => {
      rock = darkenHex(rock, points);
      walls = darkenHex(walls, points);
      roofs = darkenHex(roofs, points);
    };
    // BH-117: at 390 the whole castle is on the night bank; at 320 the bank's top
    // sits below the roofline, so the upper castle is on the grey overcast night
    // sky. The lit stone is lifted toward pale stone so it clears both, and the
    // weather mixes toward the horizon sky (which only lower contrast) are skipped.
    if (onNightBank) {
      mixAll(NIGHT_BANK_STONE, weather === 'snow' ? NIGHT_BANK_SNOW_LIFT : NIGHT_BANK_LIFT);
    }
    switch (onNightBank ? 'bank' : weather) {
      case 'overcast':
        mixAll(horizon, 0.25);
        break;
      case 'unknown':
        mixAll(horizon, 0.25);
        break;
      case 'rain':
        mixAll(horizon, 0.35);
        break;
      case 'storm':
        // Daytime only: after dark a storm is on the night bank (above).
        darkenAll(STORM_DARKEN_L);
        mixAll(STORM_SKY, 0.2);
        darkenAll(DAY_STORM_EXTRA_DARKEN_L);
        break;
      case 'fog':
        mixAll(FOG_SKY, 0.7);
        break;
      case 'snow':
        mixAll(horizon, 0.2);
        break;
      default:
        break;
    }
    // Design review of #190: under cloud (overcast, rain, snow) by day and at
    // night the grey sky sat within 1.0-1.4:1 of the castle, so darken it like
    // the storm case. Applied after the weather mix so the mix toward the light
    // horizon can't undo it. Fog is exempt and may soften. After dark the castle
    // is on the night bank instead (BH-117, above), so this is daytime only.
    const underCloud = weather === 'overcast' || weather === 'rain' || weather === 'snow';
    if (underCloud && !afterDark && !floodlit) {
      darkenAll(weather === 'snow' ? DAY_SNOW_DARKEN_L : CLOUD_DARKEN_L);
    }
    const k = (nesoIndex || '').toLowerCase();
    const haze = FAR_HAZE[k];
    if (haze) mixAll(MOOD[k as keyof typeof MOOD].haze, haze);
  }

  const light = getLandmarkLight({ timeOfDay, weather, heroLit, synthwaveMode });
  const baseWindows = afterDark ? 3 : 0;
  const litWindows = weather === 'fog' || synthwaveMode ? 0 : light.heroWindows ? 5 : baseWindows;

  return {
    rock,
    rockShade: mixHex(rock, roofs, 0.45),
    walls,
    roofs,
    litWindows,
    windowColor: LANDMARK_WINDOW_LIT,
    rim: light.rim,
    snowCap: weather === 'snow' && !synthwaveMode,
    wetSheen: weather === 'rain' && !synthwaveMode,
  };
}

/**
 * Very-clean landmark light (PR-B1 decisions): NESO band 'very low'. Without a
 * live index we fall back to the gram band so director/test scenes still show it.
 */
export function isLandmarkHeroLit(nesoIndex: string | undefined, band: CleanlinessBand): boolean {
  if (nesoIndex) return nesoIndex === 'very low';
  return band === 'very-clean';
}

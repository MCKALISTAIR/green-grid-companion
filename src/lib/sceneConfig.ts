import { bandFor, type NesoBand } from '@/lib/nesoBand';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { SceneType } from '@/hooks/useSceneType';
import { getSkyGradient } from '@/lib/sceneUtils';
import { unknownWeatherSkyGradient } from '@/lib/artPalette';
import { STAR_HAZE_FACTOR, showsSmoke, type HazeBand } from '@/lib/sceneHaze';

/** Wind state threshold, km/h (Open-Meteo default unit). Alistair, 15 Oct 2026. */
export const WIND_STATE_KMH = 25;

/**
 * Base contrast, saturation and sepia for the whole-scene time-of-day filter.
 * Carbon-independent (grass never reacts to carbon, Design decision 12): these
 * are the values the cleanest band used to get (contrast 1.2, saturation 1.2,
 * no sepia).
 */
export const SCENE_FILTER_BASE = { contrast: 1.2, saturation: 1.2, sepia: 0 } as const;

export interface SceneVisualConfig {
  cleanliness: number;
  skyGradient: string;
  groundColor: string;
  showRenewables: boolean;
  /** PR-2b: the gas plant is always present as a building (Design brief Q5). */
  showFactories: boolean;
  showBirds: boolean;
  /** PR-2b: gas-plant smoke, NESO band moderate and above only. */
  showSmoke: boolean;
  /** PR-2b: carbon haze band from the NESO index ('none' at very low, low and no data). */
  hazeBand: HazeBand;
  /** Wind state (art pass v1 §9): Open-Meteo wind_speed_10m >= WIND_STATE_KMH. */
  showWind: boolean;
  showSunRays: boolean;
  showStars: boolean;
  showMoon: boolean;
  showSun: boolean;
  showButterflies: boolean;
  showFireflies: boolean;
  isGoldenHour: boolean;
  isDaytime: boolean;
  isDarkPeriod: boolean;
  turbineCount: number;
  solarBrightness: number;
  birdCount: number;
  starVisibility: number;
  windSpeed: number;
  /** False while the weather is unknown (offline, fetch failed, cold start). */
  weatherKnown: boolean;
  sceneFilter: string;
}

interface BuildSceneConfigInput {
  intensity: number;
  index: string;
  timeOfDay: TimeOfDay;
  weather: WeatherData;
  synthwaveMode: boolean;
  isNight: boolean;
  /** Drives ground plane dialect (city pavement vs countryside grass). */
  sceneType?: SceneType;
  /** False while the weather is unknown; turbines idle and the hero halo is hidden. */
  weatherKnown?: boolean;
  /** PR-2b: haze band from the NESO index (see getHazeBand). Defaults to none. */
  hazeBand?: HazeBand;
  /** Share of the mix from solar (%). Drives panel brightness; undefined = unknown. */
  solarShare?: number;
}

/**
 * Scene audit item 2: props key to the NESO band (the label's band), never to raw
 * grams. Each band maps to one fixed "cleanliness" step, so every gate that reads
 * cleanliness (birds, butterflies, fireflies, garden, boats...) changes only at
 * a band edge.
 */
export const BAND_CLEANLINESS: Record<NesoBand, number> = {
  'very low': 1,
  low: 0.75,
  moderate: 0.5,
  high: 0.3,
  'very high': 0.1,
};

/** Solar panel brightness from the solar share of the mix (0.35 at 0%, 1 at 20%+). */
export function solarShareBrightness(solarShare: number | undefined): number {
  if (typeof solarShare !== 'number' || !Number.isFinite(solarShare)) return 0.7;
  return 0.35 + 0.65 * Math.max(0, Math.min(1, solarShare / 20));
}

export function buildSceneConfig({
  intensity,
  index,
  timeOfDay,
  weather,
  synthwaveMode,
  isNight,
  sceneType = 'countryside',
  weatherKnown = true,
  hazeBand = 'none',
  solarShare,
}: BuildSceneConfigInput): SceneVisualConfig {
  const cleanliness = BAND_CLEANLINESS[bandFor(intensity, index)];
  const weatherReducesBirds = weather.isRaining || weather.isSnowing || weather.isThunderstorm;
  const weatherReducesButterflies =
    weather.isRaining || weather.isSnowing || weather.isFoggy || weather.isThunderstorm;

  const isDaytime = timeOfDay === 'morning' || timeOfDay === 'midday' || timeOfDay === 'afternoon';
  const isGoldenHour = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const isDarkPeriod = timeOfDay === 'night' || timeOfDay === 'dusk';
  // No sun behind an overcast bank, rain or fog (art pass v1 §7).
  const skyHidden = weather.cloudCover > 70 || weather.isRaining || weather.isFoggy;
  const showSun = (isDaytime || timeOfDay === 'sunset') && !skyHidden;

  const getTimeFilter = () => {
    if (synthwaveMode) return 'contrast(1.2) saturate(1.5) hue-rotate(-10deg)';
    // Grass never reacts to carbon (Design decision 12): this filter covers the
    // whole scene, land included, so it no longer dulls or browns it by carbon.
    // Fixed at the former cleanest values; carbon shows as haze and smoke only.
    const {
      contrast: baseContrast,
      saturation: baseSaturation,
      sepia: baseSepia,
    } = SCENE_FILTER_BASE;
    switch (timeOfDay) {
      case 'dawn':
        return `contrast(${baseContrast * 0.95}) saturate(${baseSaturation * 1.1}) sepia(${baseSepia + 0.08}) hue-rotate(-5deg) brightness(0.9)`;
      case 'morning':
        return `contrast(${baseContrast}) saturate(${baseSaturation * 1.05}) sepia(${baseSepia}) brightness(1.0)`;
      case 'midday':
        return `contrast(${baseContrast * 1.05}) saturate(${baseSaturation}) sepia(${baseSepia}) brightness(1.05)`;
      case 'afternoon':
        return `contrast(${baseContrast}) saturate(${baseSaturation * 1.08}) sepia(${baseSepia + 0.03}) hue-rotate(-2deg)`;
      case 'sunset':
        return `contrast(${baseContrast * 0.95}) saturate(${baseSaturation * 1.2}) sepia(${baseSepia + 0.12}) hue-rotate(-8deg) brightness(0.92)`;
      case 'dusk':
        return `contrast(${baseContrast * 0.9}) saturate(${baseSaturation * 0.85}) sepia(${baseSepia + 0.05}) hue-rotate(5deg) brightness(0.8)`;
      case 'night':
        return `contrast(${baseContrast * 0.85}) saturate(${baseSaturation * 0.7}) brightness(0.75) hue-rotate(10deg)`;
      default:
        return `contrast(${baseContrast}) saturate(${baseSaturation}) sepia(${baseSepia})`;
    }
  };

  // Ground never reacts to carbon (Design decision 12): time, weather and snow only.
  const getGroundColor = (): string => {
    if (synthwaveMode) return '#3c096c';
    if (weather.isSnowing) return isNight ? '#334155' : '#f1f5f9';

    // City: pavement / asphalt — never countryside green
    if (sceneType === 'city') {
      if (isNight || timeOfDay === 'dusk') return '#0f172a';
      if (timeOfDay === 'dawn') return '#1e293b';
      if (timeOfDay === 'sunset') return '#334155';
      return '#4b5563';
    }

    // Coastal: wet sand / shore
    if (sceneType === 'coastal') {
      if (isNight || timeOfDay === 'dusk') return '#1c1917';
      if (timeOfDay === 'dawn' || timeOfDay === 'sunset') return '#57534e';
      return '#a8a29e';
    }

    if (isNight) return '#0f172a';
    if (timeOfDay === 'dawn') return '#204d30';
    if (timeOfDay === 'sunset') return '#365a18';
    if (timeOfDay === 'dusk') return '#1e293b';
    return '#16a34a';
  };

  return {
    cleanliness,
    skyGradient: synthwaveMode
      ? 'linear-gradient(180deg, #2b1055 0%, #7597de 100%)'
      : weatherKnown
        ? getSkyGradient(index, timeOfDay, cleanliness, weather)
        : // BH-90: no weather, so a soft overcast sky that keeps the time of day.
          unknownWeatherSkyGradient(timeOfDay),
    groundColor: getGroundColor(),
    // Turbines and panels are real kit on the grid at every band; how many
    // turbines comes from the wind share (buildTurbineLayout), not from carbon.
    showRenewables: true,
    showFactories: true,
    // BH-90: no birds when the weather is unknown (they read as stray marks).
    showBirds: weatherKnown && cleanliness > 0.6 && isDaytime && !weatherReducesBirds,
    showSmoke: showsSmoke(hazeBand),
    hazeBand,
    // Intensity never invents weather (art pass v1 §9); rain comes only from weather.isRaining.
    showWind: !synthwaveMode && weather.windSpeed >= WIND_STATE_KMH,
    showSunRays:
      cleanliness > 0.7 &&
      (timeOfDay === 'morning' || timeOfDay === 'midday' || timeOfDay === 'afternoon') &&
      weather.cloudCover < 60 &&
      !weather.isRaining,
    // PR-2b: haze thins the stars by band (-30% / -60% / hidden), never cleanliness.
    showStars:
      (isDarkPeriod || timeOfDay === 'dawn') &&
      STAR_HAZE_FACTOR[hazeBand] > 0 &&
      weather.cloudCover < 70,
    showMoon: isDarkPeriod && weather.cloudCover < 80,
    showSun,
    // BH-90: likewise butterflies (they also imply fine weather).
    showButterflies: weatherKnown && cleanliness > 0.9 && isDaytime && !weatherReducesButterflies,
    showFireflies:
      weatherKnown &&
      (isDarkPeriod || timeOfDay === 'sunset') &&
      cleanliness > 0.8 &&
      !weather.isRaining,
    isGoldenHour,
    isDaytime,
    isDarkPeriod,
    turbineCount: Math.max(1, Math.floor(cleanliness * 4)),
    solarBrightness:
      solarShareBrightness(solarShare) *
      (weather.cloudCover < 50 ? 1 : 0.6) *
      (isDaytime ? 1 : isGoldenHour ? 0.6 : 0.2),
    birdCount: Math.floor(cleanliness * 4) + 1,
    // Haze thins the star count (SceneSkyLayer), not their brightness.
    starVisibility:
      (1 - weather.cloudCover / 100) *
      (timeOfDay === 'night' ? 1 : timeOfDay === 'dusk' ? 0.6 : 0.3),
    windSpeed: weather.windSpeed,
    weatherKnown,
    sceneFilter: getTimeFilter(),
  };
}

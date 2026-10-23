import type { WeatherCondition, WeatherData } from '@/hooks/useWeatherData';

/**
 * Dev and test only: full weather for the /__scene-test buttons (BH-94 QA tooling).
 *
 * The buttons used to set only `condition`, but the scene draws from the flags
 * (`isRaining`, `isFoggy`, `isThunderstorm`, `isSnowing`) and `cloudCover`, so
 * rain, fog, snow and storms never showed. Each preset is what the live
 * Open-Meteo parser in useWeatherData produces for the WMO code named.
 */
export type SceneTestWeatherKey =
  'clear' | 'partly-cloudy' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm';

type PresetWeather = Omit<WeatherData, 'windSpeed' | 'temperature'>;

const preset = (
  condition: WeatherCondition,
  cloudCover: number,
  flags: Partial<Pick<WeatherData, 'isRaining' | 'isSnowing' | 'isFoggy' | 'isThunderstorm'>>,
  precipitationIntensity = 0,
): PresetWeather => ({
  condition,
  cloudCover,
  humidity: 75,
  isRaining: false,
  isSnowing: false,
  isFoggy: false,
  isThunderstorm: false,
  precipitationIntensity,
  ...flags,
});

export const SCENE_TEST_WEATHER: Record<SceneTestWeatherKey, PresetWeather> = {
  clear: preset('clear', 5, {}),
  'partly-cloudy': preset('partly-cloudy', 60, {}),
  overcast: preset('overcast', 95, {}),
  fog: preset('fog', 100, { isFoggy: true }),
  drizzle: preset('drizzle', 90, { isRaining: true }, 0.4),
  rain: preset('rain', 95, { isRaining: true }, 0.8),
  snow: preset('snow', 90, { isSnowing: true }, 0.6),
  thunderstorm: preset('thunderstorm', 90, { isRaining: true, isThunderstorm: true }, 1),
};

/** The WMO code each preset stands for (what Open-Meteo would send). */
export const SCENE_TEST_WMO: Record<SceneTestWeatherKey, number> = {
  clear: 0,
  'partly-cloudy': 2,
  overcast: 3,
  fog: 45,
  drizzle: 53,
  rain: 63,
  snow: 73,
  thunderstorm: 95,
};

export const SCENE_TEST_WEATHER_KEYS = Object.keys(SCENE_TEST_WEATHER) as SceneTestWeatherKey[];

/** The full WeatherData for a button, with the page's temperature and wind slider. */
export function sceneTestWeather(
  key: SceneTestWeatherKey,
  windSpeed: number,
  temperature = 15,
): WeatherData {
  return { ...SCENE_TEST_WEATHER[key], windSpeed, temperature };
}

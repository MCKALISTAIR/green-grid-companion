import type { WeatherData } from '@/hooks/useWeatherData';

/**
 * The scene's weather when we have no weather data (truth rule; Design
 * ruling on BH-90): offline with nothing cached, before the first response,
 * or when the weather fetch failed.
 *
 * Neutral overcast: the cloud bank hides the sun (cloud cover > 70), with no
 * rain, snow, fog or thunder and no wind (still air, so no wind streaks and
 * idle turbines and grass). Time of day is not part of the weather, so it
 * still comes from the device's sunrise and sunset.
 *
 * Module-level so its identity is stable across renders.
 */
export const NEUTRAL_OVERCAST_WEATHER: Readonly<WeatherData> = Object.freeze({
  condition: 'overcast',
  temperature: 15,
  humidity: 50,
  windSpeed: 0,
  cloudCover: 100,
  isRaining: false,
  isSnowing: false,
  isFoggy: false,
  isThunderstorm: false,
  precipitationIntensity: 0,
});

/**
 * The weather the scene draws: the real reading when we have one, otherwise
 * the neutral overcast state. As soon as real weather arrives it takes over.
 */
export function selectSceneWeather(fetched: WeatherData | undefined | null): {
  weather: WeatherData;
  weatherKnown: boolean;
} {
  return fetched
    ? { weather: fetched, weatherKnown: true }
    : { weather: NEUTRAL_OVERCAST_WEATHER, weatherKnown: false };
}

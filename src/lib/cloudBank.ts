import type { WeatherData } from '@/hooks/useWeatherData';

/** True when the sky is one full cloud bank: unknown weather, overcast (>70%) or rain. */
export function hasCloudBank(
  weather: Pick<WeatherData, 'cloudCover' | 'isRaining'>,
  weatherKnown = true,
) {
  return !weatherKnown || weather.cloudCover > 70 || weather.isRaining;
}

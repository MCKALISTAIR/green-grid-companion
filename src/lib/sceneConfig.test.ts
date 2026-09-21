import { describe, expect, it } from 'vitest';
import { buildSceneConfig } from './sceneConfig';
import type { WeatherData } from '@/hooks/useWeatherData';

const clearWeather = {
  condition: 'clear',
  temperature: 15,
  windSpeed: 5,
  cloudCover: 20,
  isRaining: false,
  isSnowing: false,
  isFoggy: false,
  isThunderstorm: false,
} as WeatherData;

describe('buildSceneConfig ground plane', () => {
  it('uses pavement greys for city, not countryside green', () => {
    const city = buildSceneConfig({
      intensity: 80,
      index: 'low',
      timeOfDay: 'midday',
      weather: clearWeather,
      synthwaveMode: false,
      isNight: false,
      sceneType: 'city',
    });
    const country = buildSceneConfig({
      intensity: 80,
      index: 'low',
      timeOfDay: 'midday',
      weather: clearWeather,
      synthwaveMode: false,
      isNight: false,
      sceneType: 'countryside',
    });
    expect(city.groundColor).toBe('#4b5563');
    expect(country.groundColor).toBe('#16a34a');
    expect(city.groundColor).not.toBe(country.groundColor);
  });
});

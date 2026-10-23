import { describe, expect, it } from 'vitest';
import { parseWeatherResponse } from '@/hooks/useWeatherData';
import {
  SCENE_TEST_WEATHER,
  SCENE_TEST_WEATHER_KEYS,
  SCENE_TEST_WEATHER_LABELS,
  SCENE_TEST_WMO,
  sceneTestWeather,
} from './sceneTestWeather';

// BH-94 QA tooling: each /__scene-test weather button sets the full flags the
// scene reads, exactly as the live Open-Meteo parser would for its WMO code.
describe('/__scene-test weather presets', () => {
  it.each(SCENE_TEST_WEATHER_KEYS)('%s matches the live parser for its WMO code', (key) => {
    const preset = sceneTestWeather(key, 12, 9);
    const live = parseWeatherResponse({
      current: {
        weather_code: SCENE_TEST_WMO[key],
        temperature_2m: 9,
        relative_humidity_2m: preset.humidity,
        wind_speed_10m: 12,
        cloud_cover: preset.cloudCover,
      },
    });
    expect(preset).toEqual(live);
  });

  it('covers every flag the scene draws', () => {
    expect(SCENE_TEST_WEATHER.rain.isRaining).toBe(true);
    expect(SCENE_TEST_WEATHER.fog.isFoggy).toBe(true);
    expect(SCENE_TEST_WEATHER.snow.isSnowing).toBe(true);
    expect(SCENE_TEST_WEATHER.thunderstorm).toMatchObject({
      isThunderstorm: true,
      isRaining: true,
    });
    expect(SCENE_TEST_WEATHER.clear.cloudCover).toBeLessThan(
      SCENE_TEST_WEATHER.overcast.cloudCover,
    );
  });
});

describe('scene test copy (Design copy review, 23 Oct 2026)', () => {
  it('labels every weather button in sentence case', () => {
    expect(SCENE_TEST_WEATHER_LABELS['partly-cloudy']).toBe('Partly cloudy');
    for (const key of SCENE_TEST_WEATHER_KEYS) {
      const label = SCENE_TEST_WEATHER_LABELS[key];
      expect(label).toMatch(/^[A-Z][a-z ]+$/);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { buildSceneConfig, WIND_STATE_KMH } from './sceneConfig';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { SceneType } from '@/hooks/useSceneType';

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

function ground(sceneType: SceneType, timeOfDay: TimeOfDay, intensity = 80, isNight = false) {
  return buildSceneConfig({
    intensity,
    index: 'low',
    timeOfDay,
    weather: clearWeather,
    synthwaveMode: false,
    isNight,
    sceneType,
  }).groundColor;
}

describe('buildSceneConfig ground plane (all scene dialects)', () => {
  it('never uses countryside green for city or coastal at midday', () => {
    const countryGreen = ground('countryside', 'midday');
    expect(countryGreen).toBe('#16a34a');
    expect(ground('city', 'midday')).not.toBe(countryGreen);
    expect(ground('coastal', 'midday')).not.toBe(countryGreen);
  });

  it('city stays on pavement greys across day parts', () => {
    expect(ground('city', 'midday')).toBe('#4b5563');
    expect(ground('city', 'dawn')).toBe('#1e293b');
    expect(ground('city', 'sunset')).toBe('#334155');
    expect(ground('city', 'dusk', 80, true)).toBe('#0f172a');
    expect(ground('city', 'night', 80, true)).toBe('#0f172a');
  });

  it('coastal uses sand/shore tones, not grass', () => {
    expect(ground('coastal', 'midday')).toBe('#a8a29e');
    expect(ground('coastal', 'night', 80, true)).toBe('#1c1917');
  });

  it('dirty city still uses asphalt, not brown dirt grass', () => {
    expect(ground('city', 'midday', 320)).toBe('#44403c');
  });
});

describe('art pass v1 scene logic', () => {
  const cfg = (intensity: number, windSpeed: number, isRaining = false) =>
    buildSceneConfig({
      intensity,
      index: 'very high',
      timeOfDay: 'midday',
      weather: { ...clearWeather, windSpeed, isRaining },
      synthwaveMode: false,
      isNight: false,
    });

  it('never draws rain from intensity alone (dry day at 400g)', () => {
    expect('showRain' in cfg(400, 5)).toBe(false);
  });

  it('wind state starts at 25 km/h', () => {
    expect(WIND_STATE_KMH).toBe(25);
    expect(cfg(100, 24.9).showWind).toBe(false);
    expect(cfg(100, 25).showWind).toBe(true);
  });
});

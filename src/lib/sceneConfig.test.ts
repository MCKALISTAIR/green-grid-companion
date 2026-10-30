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

  it('dirty city uses the same asphalt as clean city (Design decision 12: land never reacts to carbon)', () => {
    expect(ground('city', 'midday', 320)).toBe('#4b5563');
    expect(ground('city', 'midday', 320)).toBe(ground('city', 'midday', 20));
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

describe('scene props follow the data or the band, not grams (scene audit item 2)', () => {
  const cfg = (
    intensity: number,
    index = '',
    extra: Partial<Parameters<typeof buildSceneConfig>[0]> = {},
  ) =>
    buildSceneConfig({
      intensity,
      index,
      timeOfDay: 'midday',
      weather: { ...clearWeather, windSpeed: 36 },
      synthwaveMode: false,
      isNight: false,
      ...extra,
    });

  it('keeps turbines and panels at very high (300 g), count comes from wind share', () => {
    expect(cfg(300).showRenewables).toBe(true);
    expect(cfg(10).showRenewables).toBe(true);
  });

  it('only changes gates at band edges', () => {
    expect(cfg(25).cleanliness).toBe(cfg(89).cleanliness);
    expect(cfg(90).cleanliness).toBe(cfg(169).cleanliness);
    expect(cfg(170).cleanliness).toBe(cfg(230).cleanliness);
    expect(cfg(89).cleanliness).toBeGreaterThan(cfg(90).cleanliness);
    expect(cfg(215).cleanliness).toBe(cfg(200, 'high').cleanliness);
  });

  it('uses the label index when given', () => {
    expect(cfg(215, 'moderate').cleanliness).toBe(cfg(130).cleanliness);
  });

  it('birds by day at very low and low, butterflies at very low only', () => {
    expect(cfg(60).showBirds).toBe(true);
    expect(cfg(130).showBirds).toBe(false);
    expect(cfg(10).showButterflies).toBe(true);
    expect(cfg(60).showButterflies).toBe(false);
  });

  it('solar brightness follows solar share', () => {
    const low = cfg(130, '', { solarShare: 0 }).solarBrightness;
    const high = cfg(130, '', { solarShare: 20 }).solarBrightness;
    expect(high).toBeGreaterThan(low);
    expect(cfg(10, '', { solarShare: 5 }).solarBrightness).toBe(
      cfg(300, '', { solarShare: 5 }).solarBrightness,
    );
  });
});

import { describe, it, expect } from 'vitest';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { WeatherData } from '@/hooks/useWeatherData';
import { buildSceneConfig } from '@/lib/sceneConfig';
import { getHeroTextTone } from '@/lib/sceneUtils';
import { NEUTRAL_OVERCAST_WEATHER, selectSceneWeather } from '@/lib/sceneWeather';

// BH-90, Design ruling: unknown weather gives the neutral overcast scene (no
// sun, rain or wind effects, turbines not implying wind) and keeps the time of
// day, which comes from the device's sunrise and sunset.

const TIMES: TimeOfDay[] = ['dawn', 'morning', 'midday', 'afternoon', 'sunset', 'dusk', 'night'];
const isNightFor = (t: TimeOfDay) => t === 'night' || t === 'dusk' || t === 'dawn';

const CLEAR: WeatherData = {
  condition: 'clear',
  temperature: 20,
  humidity: 50,
  windSpeed: 30,
  cloudCover: 5,
  isRaining: false,
  isSnowing: false,
  isFoggy: false,
  isThunderstorm: false,
  precipitationIntensity: 0,
};

const config = (weather: WeatherData, timeOfDay: TimeOfDay) =>
  buildSceneConfig({
    intensity: 60,
    index: 'low',
    timeOfDay,
    weather,
    synthwaveMode: false,
    isNight: isNightFor(timeOfDay),
  });

describe('selectSceneWeather', () => {
  it.each([undefined, null])('no weather data (%s) gives the neutral overcast state', (data) => {
    const { weather, weatherKnown } = selectSceneWeather(data);
    expect(weatherKnown).toBe(false);
    expect(weather).toBe(NEUTRAL_OVERCAST_WEATHER);
    expect(weather).toMatchObject({
      condition: 'overcast',
      windSpeed: 0,
      isRaining: false,
      isSnowing: false,
      isFoggy: false,
      isThunderstorm: false,
      precipitationIntensity: 0,
    });
    expect(weather.cloudCover).toBeGreaterThan(70);
  });

  it('real weather, once it arrives, is drawn as is', () => {
    expect(selectSceneWeather(CLEAR)).toEqual({ weather: CLEAR, weatherKnown: true });
  });

  it('keeps a stable identity across calls (no effect churn)', () => {
    expect(selectSceneWeather(undefined).weather).toBe(selectSceneWeather(undefined).weather);
  });
});

describe('scene state for unknown weather', () => {
  it.each(TIMES)('%s: no sun, rays, rain or wind; time of day kept', (timeOfDay) => {
    const neutral = config(selectSceneWeather(undefined).weather, timeOfDay);
    const known = config(CLEAR, timeOfDay);

    // No invented weather.
    expect(neutral.showSun).toBe(false);
    expect(neutral.showSunRays).toBe(false);
    expect(neutral.showWind).toBe(false);
    // Turbines and grass read still air.
    expect(neutral.windSpeed).toBe(0);

    // Time of day is unchanged: same period flags and the same time grading.
    expect(neutral.isDaytime).toBe(known.isDaytime);
    expect(neutral.isGoldenHour).toBe(known.isGoldenHour);
    expect(neutral.isDarkPeriod).toBe(known.isDarkPeriod);
    expect(neutral.sceneFilter).toBe(known.sceneFilter);
    expect(neutral.groundColor).toBe(known.groundColor);
  });

  it('the hero text tone follows the overcast sky it sits on (white at dusk and night)', () => {
    for (const t of TIMES) {
      // Design review of #185: the overcast sky is dark at dusk and night, so white.
      const expected = t === 'dusk' || t === 'night' ? 'light' : 'ink';
      expect(getHeroTextTone(t, NEUTRAL_OVERCAST_WEATHER)).toBe(expected);
    }
  });

  it('known clear weather at midday still draws the sun (normal scene resumes)', () => {
    expect(config(selectSceneWeather(CLEAR).weather, 'midday').showSun).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { buildSceneConfig } from './sceneConfig';
import {
  UNKNOWN_WEATHER_PALETTE,
  unknownWeatherSkyGradient,
  unknownWeatherTone,
} from './artPalette';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';

// The neutral overcast stand-in (selectSceneWeather) used when weather is unknown.
const neutral = {
  condition: 'cloudy',
  temperature: 12,
  windSpeed: 0,
  cloudCover: 100,
  isRaining: false,
  isSnowing: false,
  isFoggy: false,
  isThunderstorm: false,
} as WeatherData;

const TIMES: TimeOfDay[] = ['night', 'dawn', 'morning', 'midday', 'afternoon', 'sunset', 'dusk'];

function config(timeOfDay: TimeOfDay, weatherKnown: boolean) {
  return buildSceneConfig({
    intensity: 0,
    index: 'very low',
    timeOfDay,
    weather: neutral,
    synthwaveMode: false,
    isNight: timeOfDay === 'night' || timeOfDay === 'dusk',
    sceneType: 'city',
    weatherKnown,
  });
}

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex: string) => {
  const [r, g, b] = hexRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe('BH-90 unknown-weather sky', () => {
  it.each(TIMES)('paints the overcast gradient at %s when the weather is unknown', (t) => {
    expect(config(t, false).skyGradient).toBe(unknownWeatherSkyGradient(t));
    expect(config(t, true).skyGradient).not.toBe(unknownWeatherSkyGradient(t));
  });

  it('has no white anywhere in the sky or bank palette', () => {
    for (const { sky, bank } of Object.values(UNKNOWN_WEATHER_PALETTE)) {
      for (const hex of [...sky, ...bank]) {
        expect(Math.min(...hexRgb(hex)), hex).toBeLessThan(220);
      }
    }
  });

  it('is light grey-blue at the top, fading into the cloud tone below', () => {
    const [top, bottom] = UNKNOWN_WEATHER_PALETTE.day.sky;
    const [r, , b] = hexRgb(top);
    expect(b).toBeGreaterThan(r); // grey-blue
    expect(luminance(bottom)).toBeGreaterThan(luminance(top));
  });

  it('keeps the time of day: darker at dusk and darker still at night', () => {
    const top = (t: TimeOfDay) => luminance(UNKNOWN_WEATHER_PALETTE[unknownWeatherTone(t)].sky[0]);
    expect(top('dusk')).toBeLessThan(top('midday') / 2);
    expect(top('night')).toBeLessThan(top('dusk'));
    expect(unknownWeatherTone('morning')).toBe('day');
    expect(unknownWeatherTone('afternoon')).toBe('day');
  });

  it('shows no birds, butterflies or fireflies when the weather is unknown', () => {
    for (const t of TIMES) {
      const c = config(t, false);
      expect([c.showBirds, c.showButterflies, c.showFireflies]).toEqual([false, false, false]);
    }
    // Known overcast weather on a clean midday still has birds.
    expect(config('midday', true).showBirds).toBe(true);
  });
});

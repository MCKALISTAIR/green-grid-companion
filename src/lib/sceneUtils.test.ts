import { describe, it, expect } from 'bun:test';
import { getSkyGradient, getSkyTopColor, getCarbonIndex, TIME_SKY_COLORS } from './sceneUtils';
import { TimeOfDay } from '../hooks/useTimeOfDay';
import { WeatherData } from '../hooks/useWeatherData';

describe('sceneUtils', () => {
  describe('getCarbonIndex', () => {
    it('returns "very low" for intensity < 50', () => {
      expect(getCarbonIndex(40)).toBe('very low');
    });

    it('returns "low" for intensity < 150', () => {
      expect(getCarbonIndex(100)).toBe('low');
    });

    it('returns "moderate" for intensity < 250', () => {
      expect(getCarbonIndex(200)).toBe('moderate');
    });

    it('returns "high" for intensity < 350', () => {
      expect(getCarbonIndex(300)).toBe('high');
    });

    it('returns "very high" for intensity >= 350', () => {
      expect(getCarbonIndex(400)).toBe('very high');
    });
  });

  describe('getSkyGradient', () => {
    it('returns default gradient for given time of day', () => {
      const timeOfDay: TimeOfDay = 'midday';
      const gradient = getSkyGradient('low', timeOfDay, 100);
      const expectedStart = TIME_SKY_COLORS[timeOfDay].start;
      const expectedMid = TIME_SKY_COLORS[timeOfDay].mid;
      const expectedEnd = TIME_SKY_COLORS[timeOfDay].end;

      expect(gradient).toContain(`linear-gradient(180deg, ${expectedStart} 0%, ${expectedMid} 40%, ${expectedEnd} 100%)`);
    });

    it('returns weather modified gradient for overcast', () => {
      const weather: WeatherData = {
        condition: 'overcast',
        temperature: 10,
        humidity: 80,
        windSpeed: 10,
        cloudCover: 80, // > 70
        isRaining: false,
        isSnowing: false,
        isFoggy: false,
        isThunderstorm: false,
        precipitationIntensity: 0
      };
      const gradient = getSkyGradient('low', 'midday', 100, weather);
      // expect it to be modified (grayish)
      expect(gradient).not.toContain(TIME_SKY_COLORS['midday'].start);
      expect(gradient).toContain('hsl(220');
    });
  });

  describe('getSkyTopColor', () => {
     it('returns default start color for given time of day', () => {
      const timeOfDay: TimeOfDay = 'midday';
      const color = getSkyTopColor('low', timeOfDay, 100);
      const expectedStart = TIME_SKY_COLORS[timeOfDay].start;

      expect(color).toBe(expectedStart);
    });

    it('returns weather modified start color for overcast', () => {
      const weather: WeatherData = {
        condition: 'overcast',
        temperature: 10,
        humidity: 80,
        windSpeed: 10,
        cloudCover: 80, // > 70
        isRaining: false,
        isSnowing: false,
        isFoggy: false,
        isThunderstorm: false,
        precipitationIntensity: 0
      };
      const color = getSkyTopColor('low', 'midday', 100, weather);
      // expect it to be modified (grayish)
      expect(color).not.toBe(TIME_SKY_COLORS['midday'].start);
      expect(color).toContain('hsl(220');
    });
  });
});

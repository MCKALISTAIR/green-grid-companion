import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { AuroraRibbon } from './WeatherArt';
import { buildSceneConfig } from '@/lib/sceneConfig';
import type { WeatherData } from '@/hooks/useWeatherData';

const night = (intensity: number, index = '') =>
  buildSceneConfig({
    intensity,
    index,
    timeOfDay: 'night',
    weather: { cloudCover: 10, windSpeed: 5 } as WeatherData,
    synthwaveMode: false,
    isNight: true,
  });

describe('aurora (scene audit item 3)', () => {
  it('is green, not grey-blue', () => {
    const { container } = render(<AuroraRibbon />);
    const fills = [...container.querySelectorAll('path')].map((p) => p.getAttribute('fill'));
    expect(fills).toEqual(['#5fd93a', '#b5f58f']);
  });

  it('gate is the very low band only, keyed to the label band', () => {
    expect(night(24).band).toBe('very low');
    expect(night(25).band).toBe('low');
    expect(night(60).band).toBe('low');
    expect(night(10, 'low').band).toBe('low');
  });
});

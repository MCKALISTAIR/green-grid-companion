import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { motionValue } from 'framer-motion';
import type { WeatherData } from '@/hooks/useWeatherData';
import { SceneCloudBankLayer } from './SceneCloudBankLayer';
import { WeatherEffects } from '../WeatherEffects';

// BH-117 (Design, option a): in city scenes the cloud bank is drawn behind the
// skyline. The sky layer leaves it out (omitBank) and SceneCloudBankLayer draws
// it at z-0, placed just before CitySceneLayers. Pixel-measured in
// e2e/castle-contrast-b1.spec.ts.
const weather = (over: Partial<WeatherData> = {}): WeatherData => ({
  condition: 'overcast',
  temperature: 10,
  humidity: 80,
  windSpeed: 5,
  cloudCover: 100,
  isRaining: false,
  isSnowing: false,
  isFoggy: false,
  isThunderstorm: false,
  precipitationIntensity: 0,
  ...over,
});

function bankLayer(w: WeatherData, weatherKnown = true, isNight = false) {
  return render(
    <SceneCloudBankLayer
      skyY={motionValue(0)}
      shouldReduceMotion
      weather={w}
      isNight={isNight}
      timeOfDay={isNight ? 'night' : 'midday'}
      weatherKnown={weatherKnown}
      cloudTopPx={222}
    />,
  ).container;
}

describe('BH-117: cloud bank behind the city skyline', () => {
  it('draws the day and night bank in its own z-0 layer', () => {
    for (const isNight of [false, true]) {
      const c = bankLayer(weather(), true, isNight);
      const layer = c.querySelector('[data-scene-bank-layer="behind-skyline"]')!;
      expect(layer).not.toBeNull();
      expect(layer.className).toContain('z-0');
      const bank = layer.querySelector('[data-art="cloud-bank"]')!;
      expect(bank.getAttribute('data-variant')).toBe('below-text');
      expect(bank.getAttribute('data-tone')).toBe(isNight ? 'night' : 'day');
      expect(bank.getAttribute('data-cloud-top')).toBe('222');
    }
  });

  it('draws the bank for rain and unknown weather, and nothing without one', () => {
    expect(
      bankLayer(weather({ cloudCover: 50, isRaining: true })).querySelector(
        '[data-art="cloud-bank"]',
      ),
    ).not.toBeNull();
    expect(
      bankLayer(weather({ cloudCover: 10 }), false).querySelector(
        '[data-variant="unknown-weather"]',
      ),
    ).not.toBeNull();
    expect(bankLayer(weather({ cloudCover: 50 })).innerHTML).toBe('');
  });

  it('the sky layer leaves the bank out when asked, and keeps it otherwise', () => {
    const sky = (omitBank: boolean) =>
      render(
        <WeatherEffects
          weather={weather()}
          isNight={false}
          cleanliness={0.5}
          timeOfDay="midday"
          cloudTopPx={222}
          omitBank={omitBank}
        />,
      ).container.querySelector('[data-art="cloud-bank"]');
    expect(sky(true)).toBeNull();
    expect(sky(false)).not.toBeNull();
  });
});

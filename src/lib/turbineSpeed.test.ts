import { describe, expect, it } from 'vitest';
import { IDLE_TURBINE_SECONDS, turbineRotationSeconds, type TurbineKind } from './turbineSpeed';
import { buildSceneConfig } from './sceneConfig';
import { NEUTRAL_OVERCAST_WEATHER } from './sceneWeather';

const KINDS: TurbineKind[] = ['countryside', 'coastal', 'offshore'];
const LAYERS = ['back', 'mid', 'front'] as const;

describe('turbine speed while the weather is unknown (BH-90)', () => {
  it('is one slow idle speed for every turbine: no stopping, no coast/inland, layer or index difference', () => {
    const speeds = new Set<number>();
    for (const kind of KINDS) {
      for (const layer of LAYERS) {
        for (let index = 0; index < 8; index += 1) {
          for (const windSpeed of [0, 10, 40]) {
            speeds.add(
              turbineRotationSeconds({ kind, windSpeed, weatherKnown: false, index, layer }),
            );
          }
        }
      }
    }
    expect([...speeds]).toEqual([IDLE_TURBINE_SECONDS]);
  });

  it('the idle speed is slow but still turning', () => {
    expect(Number.isFinite(IDLE_TURBINE_SECONDS)).toBe(true);
    expect(IDLE_TURBINE_SECONDS).toBeGreaterThan(0);
    // Slower than any known-weather speed in normal wind
    for (const kind of KINDS) {
      expect(IDLE_TURBINE_SECONDS).toBeGreaterThanOrEqual(
        turbineRotationSeconds({ kind, windSpeed: 10, weatherKnown: true }),
      );
    }
  });

  it('known weather still follows the wind per kind', () => {
    expect(turbineRotationSeconds({ kind: 'countryside', windSpeed: 0, weatherKnown: true })).toBe(
      30,
    );
    expect(turbineRotationSeconds({ kind: 'offshore', windSpeed: 30, weatherKnown: true })).toBe(6);
    expect(
      turbineRotationSeconds({ kind: 'coastal', windSpeed: 0, weatherKnown: true, index: 2 }),
    ).toBe(12);
    expect(
      turbineRotationSeconds({
        kind: 'countryside',
        windSpeed: 16,
        weatherKnown: true,
        index: 1,
        layer: 'back',
      }),
    ).toBeCloseTo(4 * 1.3 + 0.2);
  });

  it('sceneConfig carries weatherKnown (default true)', () => {
    const base = {
      intensity: 150,
      index: 'moderate',
      timeOfDay: 'midday' as const,
      weather: NEUTRAL_OVERCAST_WEATHER,
      synthwaveMode: false,
      isNight: false,
    };
    expect(buildSceneConfig(base).weatherKnown).toBe(true);
    expect(buildSceneConfig({ ...base, weatherKnown: false }).weatherKnown).toBe(false);
  });
});

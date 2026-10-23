import { describe, expect, it } from 'vitest';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import {
  cityWeatherState,
  contrastRatio,
  EDINBURGH_CASTLE_TOKENS,
  getEdinburghCastleColours,
  getLandmarkLight,
  LANDMARK_RIM_SUN,
  mixHex,
} from './cityLandmarkPalette';

const TIMES: TimeOfDay[] = ['dawn', 'morning', 'midday', 'afternoon', 'sunset', 'dusk', 'night'];
const clearWeather = {
  cloudCover: 10,
  isRaining: false,
  isSnowing: false,
  isFoggy: false,
  isThunderstorm: false,
};

describe('cityWeatherState', () => {
  it('collapses weather in priority order', () => {
    expect(cityWeatherState(false, clearWeather)).toBe('unknown');
    expect(cityWeatherState(true, clearWeather)).toBe('clear');
    expect(cityWeatherState(true, { ...clearWeather, cloudCover: 80 })).toBe('overcast');
    expect(cityWeatherState(true, { ...clearWeather, isRaining: true })).toBe('rain');
    expect(cityWeatherState(true, { ...clearWeather, isSnowing: true, isRaining: true })).toBe(
      'snow',
    );
    expect(cityWeatherState(true, { ...clearWeather, isFoggy: true, isSnowing: true })).toBe('fog');
    expect(cityWeatherState(true, { ...clearWeather, isThunderstorm: true, isFoggy: true })).toBe(
      'storm',
    );
  });
});

describe('Edinburgh Castle colours (brief §11.2)', () => {
  it('uses the brief tokens by day in clear weather with a low index', () => {
    for (const t of ['dawn', 'morning', 'midday', 'afternoon', 'sunset'] as TimeOfDay[]) {
      const c = getEdinburghCastleColours({ timeOfDay: t, weather: 'clear', heroLit: false });
      expect(c.rock).toBe(EDINBURGH_CASTLE_TOKENS[t].rock);
      expect(c.walls).toBe(EDINBURGH_CASTLE_TOKENS[t].walls);
      expect(c.roofs).toBe(EDINBURGH_CASTLE_TOKENS[t].roofs);
    }
  });

  it('gives every time of day and weather a distinct, valid palette', () => {
    for (const t of TIMES) {
      for (const w of ['clear', 'overcast', 'rain', 'storm', 'fog', 'snow', 'unknown'] as const) {
        const c = getEdinburghCastleColours({ timeOfDay: t, weather: w, heroLit: false });
        for (const v of [c.rock, c.walls, c.roofs, c.rockShade])
          expect(v).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('fog mixes 70% toward the fog sky and hides the windows; snow adds caps; rain a sheen', () => {
    const fog = getEdinburghCastleColours({ timeOfDay: 'night', weather: 'fog', heroLit: true });
    expect(fog.litWindows).toBe(0);
    expect(fog.rim).toBeNull();
    expect(
      getEdinburghCastleColours({ timeOfDay: 'midday', weather: 'snow', heroLit: false }).snowCap,
    ).toBe(true);
    expect(
      getEdinburghCastleColours({ timeOfDay: 'midday', weather: 'rain', heroLit: false }).wetSheen,
    ).toBe(true);
    const mid = getEdinburghCastleColours({ timeOfDay: 'midday', weather: 'fog', heroLit: false });
    expect(mid.rock).toBe(mixHex(EDINBURGH_CASTLE_TOKENS.midday.rock, '#d9d9d9', 0.7));
  });

  it('keeps the fog roofline at least 1.15:1 against the fog sky', () => {
    for (const t of TIMES) {
      const c = getEdinburghCastleColours({ timeOfDay: t, weather: 'fog', heroLit: false });
      expect(contrastRatio(c.roofs, '#d9d9d9')).toBeGreaterThanOrEqual(1.15);
    }
  });

  it('hazes toward the mood haze at moderate and above, harder as the index rises', () => {
    const base = getEdinburghCastleColours({
      timeOfDay: 'midday',
      weather: 'clear',
      heroLit: false,
    });
    const mod = getEdinburghCastleColours({
      timeOfDay: 'midday',
      weather: 'clear',
      heroLit: false,
      nesoIndex: 'moderate',
    });
    const vh = getEdinburghCastleColours({
      timeOfDay: 'midday',
      weather: 'clear',
      heroLit: false,
      nesoIndex: 'very high',
    });
    expect(mod.rock).not.toBe(base.rock);
    expect(vh.rock).not.toBe(mod.rock);
  });

  it('lights 3 windows after dark, 5 for the very-clean hero, none by day', () => {
    expect(
      getEdinburghCastleColours({ timeOfDay: 'midday', weather: 'clear', heroLit: false })
        .litWindows,
    ).toBe(0);
    expect(
      getEdinburghCastleColours({ timeOfDay: 'night', weather: 'clear', heroLit: false })
        .litWindows,
    ).toBe(3);
    expect(
      getEdinburghCastleColours({ timeOfDay: 'night', weather: 'clear', heroLit: true }).litWindows,
    ).toBe(5);
  });
});

describe('getLandmarkLight (very-clean hero, PR-B1 decisions)', () => {
  it('warm sun rim by day, floodlit edge plus windows after dark, nothing in fog', () => {
    expect(getLandmarkLight({ timeOfDay: 'midday', weather: 'clear', heroLit: true })).toEqual({
      rim: { color: LANDMARK_RIM_SUN, opacity: 0.6 },
      heroWindows: false,
    });
    const night = getLandmarkLight({ timeOfDay: 'night', weather: 'clear', heroLit: true });
    expect(night.heroWindows).toBe(true);
    expect(night.rim).not.toBeNull();
    expect(getLandmarkLight({ timeOfDay: 'midday', weather: 'fog', heroLit: true }).rim).toBeNull();
  });

  it('is off when not the hero, except the sunset sun-side rim', () => {
    expect(
      getLandmarkLight({ timeOfDay: 'midday', weather: 'clear', heroLit: false }).rim,
    ).toBeNull();
    expect(
      getLandmarkLight({ timeOfDay: 'sunset', weather: 'clear', heroLit: false }).rim,
    ).not.toBeNull();
    expect(
      getLandmarkLight({ timeOfDay: 'sunset', weather: 'overcast', heroLit: false }).rim,
    ).toBeNull();
  });
});

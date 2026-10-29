import { bandFor } from '@/lib/nesoBand';

/**
 * Art pass v1 palettes (from GridSense Design's src/art.js / art2.js).
 * Intensity drives only the mood (haze + saturation), never the weather.
 */
export type MoodBand = 'zero' | 'very low' | 'low' | 'moderate' | 'high' | 'very high';

export const MOOD: Record<MoodBand, { haze: string; a: number; sat: number }> = {
  zero: { haze: '#c9f7e3', a: 0.14, sat: 1.08 },
  'very low': { haze: '#ffffff', a: 0, sat: 1 },
  low: { haze: '#f1e7d0', a: 0.12, sat: 0.95 },
  moderate: { haze: '#e6d3a8', a: 0.24, sat: 0.85 },
  high: { haze: '#cfa877', a: 0.34, sat: 0.72 },
  'very high': { haze: '#a8846a', a: 0.44, sat: 0.6 },
};

/** NESO index → mood band; a live 0 g reading gets the mint 'zero' glow. */
export function getMoodBand(intensity: number, index: string): MoodBand {
  if (intensity <= 0) return 'zero';
  return bandFor(intensity, index);
}

export type SunTone = 'day' | 'dawn' | 'sunset';
export const SUN_COLOURS: Record<SunTone, [string, string]> = {
  day: ['#fff6d6', '#fcd34d'],
  dawn: ['#ffe7b0', '#fbbf24'],
  sunset: ['#ffd29a', '#f59e0b'],
};

export const CLOUD_COLOURS = {
  day: ['#ffffff', '#dbe4ee'],
  dawn: ['#fbe3dc', '#d9b3b8'],
  sunset: ['#ffe2c7', '#e0a989'],
  night: ['#3a4270', '#262c52'],
} as const;

export const CLOUD_BANK_COLOURS = {
  day: ['#dfe5ec', '#aab6c3'],
  night: ['#3a4270', '#262c52'],
} as const;

/**
 * Design review of #185 (23 Oct 2026): by day (dawn to sunset) the overcast bank
 * that sits below the hero text (overcast, rain, snow) is a mid-grey close to the
 * overcast sky above it (sky ~hsl(220 7% 59%), see getSkyGradient), never a
 * lighter mass: its body stays within ~1.15:1 of that sky and steps darker toward
 * the horizon. Only the top lobes carry a lit rim. Pixel-measured in
 * e2e/cloud-bank-day.spec.ts.
 */
export const CLOUD_BANK_DAY_BELOW_TEXT = {
  back: 'hsl(220 8% 57.5%)',
  front: 'hsl(220 8% 58.5%)',
  base: 'hsl(220 9% 54.5%)',
  rim: 'rgba(255,255,255,0.38)',
} as const;

/**
 * BH-90: weather unknown (offline or Open-Meteo failed). A soft overcast sky,
 * light grey-blue at the top fading into the cloud tone, never white; darker at
 * dusk and night. `bank` is [back (paler), front, base shade]; `rim` is the lit
 * top edge (ART-DIRECTION.md §5).
 */
export type UnknownWeatherTone = 'day' | 'dawn' | 'sunset' | 'dusk' | 'night';

export const UNKNOWN_WEATHER_PALETTE: Record<
  UnknownWeatherTone,
  { sky: readonly [string, string]; bank: readonly [string, string, string]; rim: string }
> = {
  day: {
    sky: ['#a9b7c6', '#b9c2cd'],
    bank: ['#c6cdd6', '#bac3ce', '#a1abb8'],
    rim: 'rgba(255,255,255,0.42)',
  },
  dawn: {
    sky: ['#a4a9ba', '#bbb9c2'],
    bank: ['#c4c2ca', '#b1afba', '#9a98a6'],
    rim: 'rgba(255,240,236,0.45)',
  },
  sunset: {
    sky: ['#9ea2b4', '#b7b1b5'],
    bank: ['#c0b9bc', '#aca5ab', '#958e97'],
    rim: 'rgba(255,236,220,0.45)',
  },
  dusk: {
    sky: ['#464f6b', '#5e6680'],
    bank: ['#69718c', '#59617c', '#454c66'],
    rim: 'rgba(255,255,255,0.3)',
  },
  night: {
    sky: ['#232944', '#333a58'],
    bank: ['#3c4363', '#323957', '#262c47'],
    rim: 'rgba(255,255,255,0.2)',
  },
};

export function unknownWeatherTone(timeOfDay: string): UnknownWeatherTone {
  if (timeOfDay === 'dawn' || timeOfDay === 'sunset' || timeOfDay === 'dusk') return timeOfDay;
  if (timeOfDay === 'night') return 'night';
  return 'day';
}

/** CSS sky for the unknown-weather scene: grey-blue top into the cloud tone. */
export function unknownWeatherSkyGradient(timeOfDay: string): string {
  const [top, bottom] = UNKNOWN_WEATHER_PALETTE[unknownWeatherTone(timeOfDay)].sky;
  return `linear-gradient(180deg, ${top} 0%, ${bottom} 75%, ${bottom} 100%)`;
}

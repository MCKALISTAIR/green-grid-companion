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
  const k = (index || '').toLowerCase();
  if (k in MOOD) return k as MoodBand;
  if (intensity < 40) return 'very low';
  if (intensity < 120) return 'low';
  if (intensity < 200) return 'moderate';
  if (intensity < 290) return 'high';
  return 'very high';
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

import { describe, expect, it } from 'vitest';
import { getHeroTextTone, HERO_INK, TIME_SKY_COLORS } from './sceneUtils';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';

type RGB = [number, number, number];
const parseHsl = (s: string): RGB => {
  const m = s.match(/hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)/);
  if (!m) throw new Error(`bad hsl ${s}`);
  const [h, sat, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
};
const hex = (s: string): RGB => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB;
const lum = (c: RGB) => {
  const [r, g, b] = c.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: RGB, b: RGB) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const mix = (c: RGB, o: RGB, a: number): RGB => c.map((v, i) => v * (1 - a) + o[i] * a) as RGB;
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
// Weakest point of the dark HUD scrim over the text block (scene-hud-scrim ~55% stop).
const DARK_SCRIM = 0.32;

// Sky stops behind the hero text: gradient start (0%) and mid (40%).
const skies: Array<[string, TimeOfDay, Parameters<typeof getHeroTextTone>[1], string[]]> = [
  ...(Object.keys(TIME_SKY_COLORS) as TimeOfDay[]).map(
    (t) =>
      [t, t, undefined, [TIME_SKY_COLORS[t].start, TIME_SKY_COLORS[t].mid]] as [
        string,
        TimeOfDay,
        undefined,
        string[],
      ],
  ),
  [
    'overcast (night)',
    'night',
    { cloudCover: 100, isRaining: true, isFoggy: false, isThunderstorm: false },
    ['hsl(220 8% 53%)', 'hsl(220 7% 58%)'],
  ],
  [
    'fog',
    'midday',
    { cloudCover: 50, isRaining: false, isFoggy: true, isThunderstorm: false },
    ['hsl(0 0% 75%)', 'hsl(0 0% 80%)'],
  ],
  [
    'thunder',
    'midday',
    { cloudCover: 60, isRaining: false, isFoggy: false, isThunderstorm: true },
    ['hsl(240 30% 25%)', 'hsl(240 30% 35%)'],
  ],
];

describe('hero text AA contrast against the actual sky', () => {
  it.each(skies)('%s passes 4.5:1', (_n, t, w, stops) => {
    const tone = getHeroTextTone(t, w);
    for (const s of stops) {
      const sky = parseHsl(s);
      const r =
        tone === 'ink' ? ratio(hex(HERO_INK), sky) : ratio(WHITE, mix(sky, BLACK, DARK_SCRIM));
      expect(r).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('uses ink on day and sunset, white on night', () => {
    expect(getHeroTextTone('midday')).toBe('ink');
    expect(getHeroTextTone('sunset')).toBe('ink');
    expect(getHeroTextTone('night')).toBe('light');
    expect(getHeroTextTone('dusk')).toBe('light');
  });
});

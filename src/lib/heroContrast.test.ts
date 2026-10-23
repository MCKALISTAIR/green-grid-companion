import { describe, expect, it } from 'vitest';
import {
  getHeroTextTone,
  getSkyGradient,
  HERO_CHIP,
  HERO_INK,
  TIME_SKY_COLORS,
} from './sceneUtils';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import { MOOD, UNKNOWN_WEATHER_PALETTE, unknownWeatherTone } from './artPalette';

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

describe('hero location pill + trophy chip AA on every sky (light and dark mode)', () => {
  // Chip colours are fixed hex, independent of theme, so one check covers both modes.
  it.each(skies)('%s: text 4.5:1, icon 3:1, boundary 3:1', (_n, _t, _w, stops) => {
    for (const fill of [HERO_CHIP.fill, HERO_CHIP.fillHover]) {
      expect(ratio(hex(HERO_CHIP.text), hex(fill))).toBeGreaterThanOrEqual(4.5);
      expect(ratio(hex(HERO_CHIP.icon), hex(fill))).toBeGreaterThanOrEqual(3);
      // Ring is adjacent to the fill; whichever of fill/ring meets the sky identifies the chip.
      expect(ratio(hex(HERO_CHIP.border), hex(fill))).toBeGreaterThanOrEqual(3);
      for (const s of stops) {
        const sky = parseHsl(s);
        const edge = Math.max(ratio(hex(fill), sky), ratio(hex(HERO_CHIP.border), sky));
        expect(edge).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

// Art pass PR 3: the intensity mood haze sits over the sky. Its gradient starts at
// 30% of the scene; take the worst case (full haze alpha) at the 40% sky stop.
describe('hero text AA with the intensity mood haze', () => {
  const sat = (c: RGB, k: number): RGB => {
    const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return c.map((v) => Math.max(0, Math.min(255, l + (v - l) * k))) as RGB;
  };
  const cases = skies.flatMap(([n, t, w, stops]) =>
    Object.entries(MOOD).map(([band, m]) => [`${n} / ${band}`, t, w, stops[1], m] as const),
  );
  it.each(cases)('%s passes 4.5:1', (_n, t, w, stop, m) => {
    const tone = getHeroTextTone(t, w);
    const sky = mix(sat(parseHsl(stop), m.sat), hex(m.haze), m.a);
    const r =
      tone === 'ink' ? ratio(hex(HERO_INK), sky) : ratio(WHITE, mix(sky, BLACK, DARK_SCRIM));
    expect(r).toBeGreaterThanOrEqual(4.5);
  });
});

// BH-92 (Design ruling, 23 Oct 2026): the hero warning icon is steady (full
// opacity, no pulse) in every error state and follows the hero text rule: ink on
// light skies, white on dark ones. As a non-text graphic it needs >= 3:1 against
// the sky behind it at every time of day, with known and unknown weather.
describe('BH-92 hero warning icon contrast (steady, >= 3:1)', () => {
  const TIMES = Object.keys(TIME_SKY_COLORS) as TimeOfDay[];
  // The icon colour, mirroring IntensityHeroOverlay: ink class on ink tone, else white.
  const iconColour = (tone: ReturnType<typeof getHeroTextTone>): RGB =>
    tone === 'ink' ? hex(HERO_INK) : WHITE;
  // White icons sit over the dark HUD scrim (weakest stop); ink icons get no help
  // (the light veil is ignored, and is off entirely with the weather unknown).
  const behind = (tone: ReturnType<typeof getHeroTextTone>, sky: RGB): RGB =>
    tone === 'ink' ? sky : mix(sky, BLACK, DARK_SCRIM);

  it.each(skies)('known weather, %s: icon >= 3:1 at full opacity', (_n, t, w, stops) => {
    const tone = getHeroTextTone(t, w);
    for (const s of stops) {
      expect(ratio(iconColour(tone), behind(tone, parseHsl(s)))).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(TIMES)('unknown weather (neutral overcast), %s: icon >= 3:1', (t) => {
    // BH-90: with the weather unknown the tone follows the time of day only.
    const tone = getHeroTextTone(t, undefined);
    for (const s of UNKNOWN_WEATHER_PALETTE[unknownWeatherTone(t)].sky) {
      expect(ratio(iconColour(tone), behind(tone, hex(s)))).toBeGreaterThanOrEqual(3);
    }
  });

  // Full matrix: every time of day x weather x haze, using the sky the scene
  // actually resolves (getSkyGradient) at the stops behind the icon (0% and 40%).
  const WEATHERS: Array<[string, Partial<WeatherData>]> = [
    ['clear', { cloudCover: 0 }],
    ['partly cloudy', { cloudCover: 40 }],
    ['overcast', { cloudCover: 100 }],
    ['rain', { cloudCover: 80, isRaining: true }],
    ['fog', { cloudCover: 50, isFoggy: true }],
    ['storm', { cloudCover: 60, isThunderstorm: true }],
  ];
  const HAZES: Array<[string, (typeof MOOD)[keyof typeof MOOD] | null]> = [
    ['no haze', null],
    ...Object.entries(MOOD),
  ];
  const matrix = TIMES.flatMap((t) =>
    WEATHERS.flatMap(([wn, w]) =>
      HAZES.map(([hn, m]) => [`${t} / ${wn} / ${hn}`, t, w, m] as const),
    ),
  );
  it.each(matrix)('%s: icon >= 3:1', (_n, t, w, m) => {
    const weather = {
      condition: 'clear',
      temperature: 12,
      windSpeed: 5,
      cloudCover: 0,
      isRaining: false,
      isSnowing: false,
      isFoggy: false,
      isThunderstorm: false,
      ...w,
    } as WeatherData;
    const tone = getHeroTextTone(t, weather);
    const stops = getSkyGradient('low', t, 0.8, weather)
      .match(/hsl\([^)]+\)/g)!
      .slice(0, 2);
    for (const stop of stops) {
      let sky = parseHsl(stop);
      if (m) {
        const l = 0.2126 * sky[0] + 0.7152 * sky[1] + 0.0722 * sky[2];
        sky = mix(sky.map((v) => l + (v - l) * m.sat) as RGB, hex(m.haze), m.a);
      }
      expect(ratio(iconColour(tone), behind(tone, sky))).toBeGreaterThanOrEqual(3);
    }
  });

  it('is ink on light skies and white on dark ones', () => {
    expect(iconColour(getHeroTextTone('midday'))).toEqual(hex('#0f1a24'));
    expect(iconColour(getHeroTextTone('night'))).toEqual(WHITE);
  });
});

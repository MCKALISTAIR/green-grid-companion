import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { WeatherData } from '@/hooks/useWeatherData';
import type { SceneType } from '@/hooks/useSceneType';
import { buildSceneConfig } from '@/lib/sceneConfig';
import { LandscapeBack, LandscapeFront, LandscapeMid } from '@/components/scene/Landscape';

/**
 * Design decision 12 ("grass never reacts to carbon", BRIEF Q5): land, trees and
 * ground depend only on time, weather and snow. Carbon shows only as haze and
 * gas-plant smoke. So every land token must be identical across all NESO bands.
 */

const TIMES: TimeOfDay[] = ['dawn', 'morning', 'midday', 'afternoon', 'sunset', 'dusk', 'night'];
const isNightFor = (t: TimeOfDay) => t === 'night' || t === 'dusk';

const BASE: WeatherData = {
  condition: 'clear',
  temperature: 12,
  humidity: 60,
  windSpeed: 8,
  cloudCover: 5,
  isRaining: false,
  isSnowing: false,
  isFoggy: false,
  isThunderstorm: false,
  precipitationIntensity: 0,
};
const WEATHERS: Record<string, WeatherData> = {
  clear: BASE,
  overcast: { ...BASE, condition: 'overcast', cloudCover: 95 },
  rain: { ...BASE, condition: 'rain', cloudCover: 90, isRaining: true, precipitationIntensity: 2 },
  storm: {
    ...BASE,
    condition: 'thunderstorm',
    cloudCover: 100,
    isRaining: true,
    isThunderstorm: true,
    windSpeed: 40,
  },
  snow: { ...BASE, condition: 'snow', cloudCover: 90, isSnowing: true, temperature: -1 },
  fog: { ...BASE, condition: 'fog', cloudCover: 80, isFoggy: true },
};

/** One reading per NESO band, including the extremes of the old cleanliness scale. */
const BANDS: [index: string, intensity: number][] = [
  ['very low', 0],
  ['very low', 30],
  ['low', 110],
  ['moderate', 180],
  ['high', 260],
  ['very high', 340],
  ['very high', 600],
];

const SCENES: SceneType[] = ['countryside', 'city', 'coastal'];

const cleanlinessOf = (intensity: number, index: string) =>
  buildSceneConfig({
    intensity,
    index,
    timeOfDay: 'midday',
    weather: BASE,
    synthwaveMode: false,
    isNight: false,
  }).cleanliness;

describe('grass never reacts to carbon (Design decision 12)', () => {
  it('the bands really do span the whole band cleanliness scale', () => {
    const cs = BANDS.map(([i, g]) => cleanlinessOf(g, i));
    expect(Math.max(...cs)).toBe(1);
    expect(Math.min(...cs)).toBe(0.1);
  });

  for (const sceneType of SCENES) {
    it(`${sceneType}: ground colour and scene filter are identical across all bands`, () => {
      for (const t of TIMES) {
        for (const [wn, weather] of Object.entries(WEATHERS)) {
          for (const synthwaveMode of [false, true]) {
            const land = BANDS.map(([index, intensity]) => {
              const c = buildSceneConfig({
                intensity,
                index,
                timeOfDay: t,
                weather,
                synthwaveMode,
                isNight: isNightFor(t),
                sceneType,
              });
              return { ground: c.groundColor, filter: c.sceneFilter };
            });
            for (const l of land) expect(l, `${sceneType} ${t} ${wn}`).toEqual(land[0]);
          }
        }
      }
    });
  }

  /** Every colour the land draws, outside the cottage (its lit window is not land). */
  function landColours(el: HTMLElement): string[] {
    const out: string[] = [];
    el.querySelectorAll('*').forEach((n) => {
      if (n.closest('svg[viewBox="-16 -20 32 36"]')) return; // the Cottage
      for (const a of ['fill', 'stop-color', 'stroke']) {
        const v = n.getAttribute(a);
        if (v && !v.startsWith('url(')) out.push(`${n.tagName}:${a}:${v}`);
      }
    });
    return out;
  }

  it('countryside hills and trees: identical tokens for every band, time and weather', () => {
    const layers = [LandscapeBack, LandscapeMid, LandscapeFront];
    for (const t of TIMES) {
      for (const isSnowing of [false, true]) {
        const drawn = BANDS.map(([, intensity]) => {
          const cleanliness = cleanlinessOf(intensity);
          return layers.map((Layer) => {
            const { container, unmount } = render(
              <svg viewBox="0 30 400 120">
                <Layer
                  cleanliness={cleanliness}
                  isNight={isNightFor(t)}
                  synthwaveMode={false}
                  isSnowing={isSnowing}
                  timeOfDay={t}
                  skipIntro
                />
              </svg>,
            );
            const colours = landColours(container);
            unmount();
            return colours;
          });
        });
        expect(drawn[0].flat().length).toBeGreaterThan(10);
        for (const d of drawn) expect(d, `${t} snow=${isSnowing}`).toEqual(drawn[0]);
      }
    }
  });

  it('no brown land at very high (the old dirty midday tokens are gone)', () => {
    const { container } = render(
      <svg viewBox="0 30 400 120">
        <LandscapeFront
          cleanliness={0}
          isNight={false}
          synthwaveMode={false}
          timeOfDay="midday"
          skipIntro
        />
      </svg>,
    );
    const html = container.innerHTML.toLowerCase();
    for (const brown of ['#a16207', '#713f12', '#854d0e', '#451a03', '#61330b', '#2d1402']) {
      expect(html).not.toContain(brown);
    }
  });
});

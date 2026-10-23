import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { motionValue } from 'framer-motion';
import { CitySceneLayers, type CitySceneLayersProps } from './CitySceneLayers';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import type { CityVariant } from '@/hooks/useSceneType';

// PR-B2: the London landmarks (Shard-like tower, clock tower, London Eye) and
// the Tube flash render only for the 'london' city variant.
const LONDON_LANDMARKS = ['glass-tower-far', 'clock-tower', 'glass-tower-near', 'london-eye'];

function renderCity(cityVariant?: CityVariant) {
  const props: CitySceneLayersProps = {
    shouldReduceMotion: false,
    backY: motionValue(0),
    midY: motionValue(0),
    sceneConfig: { cleanliness: 0.9, isDaytime: true } as SceneVisualConfig,
    isNight: false,
    synthwaveMode: false,
    isSnowing: false,
    skipIntro: true,
    windSpeed: 5,
    timeOfDay: 'midday',
    cleanlinessBand: 'very-clean',
    intensity: 40,
    cityVariant,
  };
  return render(<CitySceneLayers {...props} />);
}

function landmarks(container: HTMLElement) {
  return [...container.querySelectorAll('[data-city-landmark]')].map((el) =>
    el.getAttribute('data-city-landmark'),
  );
}

describe('CitySceneLayers city variant', () => {
  it('London draws its landmarks and the Tube flash', () => {
    const { container } = renderCity('london');
    const found = landmarks(container);
    for (const lm of LONDON_LANDMARKS) expect(found).toContain(lm);
    expect(found).toContain('tube-flash');
    expect(container.querySelector('[data-city-variant="london"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-city-landmark-slot]')).toHaveLength(0);
  });

  it.each(['edinburgh', 'generic'] as const)(
    '%s draws no London landmarks and no Tube, and leaves the art slot',
    (variant) => {
      const { container } = renderCity(variant);
      expect(landmarks(container)).toEqual([]);
      const slots = [...container.querySelectorAll('[data-city-landmark-slot]')].map((el) =>
        el.getAttribute('data-city-landmark-slot'),
      );
      const expected = [`${variant}-back`, `${variant}-mid`, `${variant}-front`];
      // Edinburgh also gets the far landmark layer (castle slot) behind the back row.
      expect(slots).toEqual(variant === 'edinburgh' ? ['edinburgh-far', ...expected] : expected);
    },
  );

  it('defaults to generic when no variant is passed', () => {
    const { container } = renderCity(undefined);
    expect(landmarks(container)).toEqual([]);
    expect(container.querySelector('[data-city-variant="generic"]')).not.toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { motionValue } from 'framer-motion';
import { CitySceneLayers, type CitySceneLayersProps } from './CitySceneLayers';
import { isLandmarkHeroLit } from '@/lib/cityLandmarkPalette';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import type { CityVariant } from '@/hooks/useSceneType';

// PR-B2: the London landmarks (Shard-like tower, clock tower, dome, London Eye)
// and the Tube flash render only for the 'london' city variant.
// PR-B1: Edinburgh and generic get the neutral GB skyline (church spire, no
// domes); Edinburgh adds the castle in the far layer.
const LONDON_LANDMARKS = [
  'glass-tower-far',
  'clock-tower',
  'dome',
  'glass-tower-near',
  'london-eye',
];

function renderCity(cityVariant?: CityVariant, extra: Partial<CitySceneLayersProps> = {}) {
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
    ...extra,
  };
  return render(<CitySceneLayers {...props} />);
}

function art(container: HTMLElement) {
  return [...container.querySelectorAll('[data-city-art]')].map((el) =>
    el.getAttribute('data-city-art'),
  );
}

function landmarks(container: HTMLElement) {
  return [...container.querySelectorAll('[data-city-landmark]')].map((el) =>
    el.getAttribute('data-city-landmark'),
  );
}

describe('CitySceneLayers city variant', () => {
  it('London draws its landmarks and the Tube flash, and none of the neutral art', () => {
    const { container } = renderCity('london');
    const found = landmarks(container);
    for (const lm of LONDON_LANDMARKS) expect(found).toContain(lm);
    expect(found).toContain('tube-flash');
    expect(container.querySelector('[data-city-variant="london"]')).not.toBeNull();
    expect(art(container)).toEqual([]);
    expect(container.querySelector('[data-city-landmark-layer]')).toBeNull();
  });

  it.each(['edinburgh', 'generic'] as const)(
    '%s draws the neutral skyline with a church spire and no London landmarks or domes',
    (variant) => {
      const { container } = renderCity(variant);
      expect(landmarks(container)).toEqual([]);
      const found = art(container);
      expect(found).toEqual(
        expect.arrayContaining([`${variant}-back`, `${variant}-mid`, `${variant}-front`]),
      );
      expect(found).toContain('church-spire');
      expect(found.filter((a) => a === 'terrace').length).toBeGreaterThanOrEqual(4);
      expect(found).toContain('far-crane');
      // Banned shapes (brief §11.1): no Eye, no dome, no clock tower, no glass towers.
      expect(container.querySelector('[data-city-landmark="dome"]')).toBeNull();
      expect(container.innerHTML).not.toMatch(/london-eye|clock-tower|glass-tower/);
    },
  );

  it('Edinburgh puts the castle in its own far layer behind the back row, without the tower', () => {
    const { container } = renderCity('edinburgh');
    const layer = container.querySelector('[data-city-landmark-layer="edinburgh-far"]');
    expect(layer?.querySelector('[data-city-art="edinburgh-castle"]')).not.toBeNull();
    const back = container.querySelector('[data-city-variant="edinburgh"]');
    // The far layer comes before (so paints behind) the back skyline.
    expect(layer!.compareDocumentPosition(back!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(art(container)).not.toContain('neutral-tower');
  });

  it('generic gets the one plain tower and no castle', () => {
    const { container } = renderCity('generic');
    expect(art(container)).toContain('neutral-tower');
    expect(art(container)).not.toContain('edinburgh-castle');
  });

  it.each([
    ['edinburgh', 'edinburgh-castle'],
    ['generic', 'church-spire'],
  ] as const)('%s lights the %s only when the NESO band is very low', (variant, hero) => {
    const lit = renderCity(variant, { nesoIndex: 'very low', cleanlinessBand: 'clean' });
    expect(lit.container.querySelector(`[data-city-art="${hero}"]`)).toHaveAttribute(
      'data-landmark-hero',
      'lit',
    );
    expect(lit.container.querySelectorAll('[data-landmark-hero="lit"]')).toHaveLength(1);
    lit.unmount();
    const off = renderCity(variant, { nesoIndex: 'low', cleanlinessBand: 'very-clean' });
    expect(off.container.querySelectorAll('[data-landmark-hero="lit"]')).toHaveLength(0);
  });

  it('falls back to the gram band for the landmark light without a NESO index', () => {
    expect(isLandmarkHeroLit(undefined, 'very-clean')).toBe(true);
    expect(isLandmarkHeroLit(undefined, 'clean')).toBe(false);
    expect(isLandmarkHeroLit('very low', 'moderate')).toBe(true);
    expect(isLandmarkHeroLit('low', 'very-clean')).toBe(false);
  });

  it('defaults to generic when no variant is passed', () => {
    const { container } = renderCity(undefined);
    expect(landmarks(container)).toEqual([]);
    expect(container.querySelector('[data-city-variant="generic"]')).not.toBeNull();
  });
});

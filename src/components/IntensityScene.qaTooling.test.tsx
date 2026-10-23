import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { IntensityScene } from './IntensityScene';
import React from 'react';
import { SceneDirectorProvider } from './SceneDirectorProvider';
import { useSceneDirector } from '@/hooks/useSceneDirector';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import { sceneTestWeather } from '@/lib/sceneTestWeather';

// BH-94 QA tooling: SceneTest/Director overrides reach the scene and match
// production. Same hook mocks as IntensityScene.test.tsx, except Director Mode,
// which is real here so the shared context is exercised.

// Mock hooks
vi.mock('@/hooks/useHaptics', () => ({
  useHaptics: () => ({
    impactLight: vi.fn(),
    impactMedium: vi.fn(),
    notification: vi.fn(),
  }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

vi.mock('@/hooks/useTimeOfDay', () => ({
  useTimeOfDay: () => ({
    timeOfDay: 'morning',
    isNight: false,
    sunPosition: { azimuth: 0, altitude: 0 },
  }),
  TimeOfDay: {
    Day: 'day',
    Night: 'night',
  },
}));

vi.mock('@/hooks/useWeatherData', () => ({
  useWeatherData: () => ({
    weather: {
      isRaining: false,
      isSnowing: false,
      isThunderstorm: false,
      isFoggy: false,
      cloudCover: 0,
      windSpeed: 10,
    },
  }),
}));

vi.mock('@/hooks/useAchievements', () => ({
  useAchievements: () => ({
    unlock: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSceneType', () => ({
  useSceneType: () => ({
    sceneType: 'countryside',
    preference: 'auto',
    setPreference: vi.fn(),
    autoDetected: 'countryside',
    cityVariant: 'generic',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  // Use the factory's own React import: the test's top-level `React` binding may
  // not be initialised yet when a module calls into this mock at load time.
  const R = await vi.importActual<typeof import('react')>('react');
  const MOTION_PROPS = new Set([
    'animate',
    'transition',
    'variants',
    'initial',
    'exit',
    'whileHover',
    'whileTap',
    'whileDrag',
    'whileFocus',
    'whileInView',
    'layout',
    'layoutId',
    'onPan',
    'onPanStart',
    'onPanEnd',
    'onTap',
    'viewport',
    'drag',
    'dragConstraints',
  ]);
  const strip = (props: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(props).filter(([k]) => !MOTION_PROPS.has(k)));
  const wrap = (Tag: React.ElementType) =>
    R.forwardRef(({ children, ...props }: { children?: React.ReactNode }, ref) =>
      R.createElement(Tag, { ...strip(props), ref }, children),
    );
  const cache = new Map<unknown, unknown>();
  const create = (Component: React.ElementType) => {
    if (!cache.has(Component)) cache.set(Component, wrap(Component));
    return cache.get(Component);
  };
  const motion = new Proxy(
    {},
    {
      get: (_target, prop) => (prop === 'create' ? create : create(prop as React.ElementType)),
    },
  );

  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion,
  };
});

const scene = () => screen.getByRole('region', { name: /Animated landscape/ });

describe('IntensityScene overrides: dawn parity with production', () => {
  it.each<[TimeOfDay, 'on' | 'off']>([
    ['night', 'on'],
    ['dusk', 'on'],
    ['dawn', 'off'],
    ['morning', 'off'],
    ['midday', 'off'],
    ['afternoon', 'off'],
    ['sunset', 'off'],
  ])('timeOfDayOverride %s: night %s (same rule as useTimeOfDay)', (time, night) => {
    render(<IntensityScene intensity={100} index="moderate" timeOfDayOverride={time} />);
    expect(scene()).toHaveAttribute('data-time-of-day', time);
    expect(scene()).toHaveAttribute('data-scene-night', night);
  });
});

describe('Director Mode context', () => {
  let director: ReturnType<typeof useSceneDirector> | undefined;
  function Panel() {
    director = useSceneDirector();
    return null;
  }

  it('DirectorPanel-style overrides from one component reach IntensityScene', () => {
    director = undefined;
    render(
      <SceneDirectorProvider>
        <Panel />
        <IntensityScene intensity={100} index="moderate" />
      </SceneDirectorProvider>,
    );
    expect(scene()).toHaveAttribute('data-time-of-day', 'morning');

    act(() => {
      director!.setActive(true);
      director!.setExactOverride('timeOfDay', 'dawn');
      director!.setExactOverride('sceneType', 'city');
      director!.setExactOverride('intensity', 400);
    });
    expect(scene()).toHaveAttribute('data-time-of-day', 'dawn');
    // Dawn parity on the Director path too
    expect(scene()).toHaveAttribute('data-scene-night', 'off');
    expect(scene()).toHaveAttribute('data-scene-type', 'city');
    expect(scene()).toHaveAccessibleName(/very high carbon intensity/);

    act(() => director!.setExactOverride('timeOfDay', 'dusk'));
    expect(scene()).toHaveAttribute('data-scene-night', 'on');

    act(() => director!.setActive(false));
    expect(scene()).toHaveAttribute('data-time-of-day', 'morning');
    expect(scene()).toHaveAttribute('data-scene-type', 'countryside');
  });

  it('outside a provider Director Mode is off and its setters are no-ops', () => {
    director = undefined;
    render(<Panel />);
    expect(director!.active).toBe(false);
    expect(director!.unlocked).toBe(false);
    expect(director!.overrides).toEqual({});
    expect(() => director!.setActive(true)).not.toThrow();
  });
});

describe('/__scene-test weather buttons drive the scene flags', () => {
  it.each([
    ['rain', '[data-art="rain"]'],
    ['thunderstorm', '[data-art="rain"]'],
    ['fog', '[data-art="fog"]'],
    ['partly-cloudy', '[data-art-cloud]'],
  ] as const)('the %s button draws %s', (key, selector) => {
    render(
      <IntensityScene
        intensity={100}
        index="moderate"
        timeOfDayOverride="midday"
        weatherOverride={sceneTestWeather(key, 5)}
      />,
    );
    expect(scene().querySelector(selector)).not.toBeNull();
  });

  it('a condition-only override (the old buttons) drew no rain', () => {
    render(
      <IntensityScene
        intensity={100}
        index="moderate"
        timeOfDayOverride="midday"
        weatherOverride={{ condition: 'rain', temperature: 15, windSpeed: 5 }}
      />,
    );
    expect(scene().querySelector('[data-art="rain"]')).toBeNull();
  });
});

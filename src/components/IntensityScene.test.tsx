import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntensityScene } from './IntensityScene';
import React from 'react';

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
    timeOfDay: 'day',
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

vi.mock('@/hooks/useSceneDirector', () => ({
  useSceneDirector: () => ({
    active: false,
    overrides: {},
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

describe('IntensityScene', () => {
  it('renders correctly', () => {
    render(<IntensityScene intensity={100} index="moderate" />);
    // Scene is a region (hotspots are focusable; role="img" forbids that)
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('renders wind turbines when clean', () => {
    // Mock cleanliness to be high by setting intensity low
    render(<IntensityScene intensity={20} index="very low" />);
    // WindTurbine uses role="button"
    // cleanliness = 1. Turbine count = 4.
    const turbines = screen.getAllByRole('button', { name: /Wind Turbine/i });
    expect(turbines.length).toBeGreaterThan(0);
  });

  it('renders vintage snapshot without crashing', () => {
    render(<IntensityScene intensity={120} index="moderate" isVintage />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });
});

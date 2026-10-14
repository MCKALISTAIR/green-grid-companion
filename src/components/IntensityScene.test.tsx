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
  }
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
  const actual = await vi.importActual('framer-motion');
  const motion = new Proxy({}, {
    get: (target, prop) => {
      // Returns a component that renders the tag with the property name
      return React.forwardRef(({
        children,
        animate,
        transition,
        variants,
        initial,
        exit,
        whileHover,
        whileTap,
        whileDrag,
        whileFocus,
        layout,
        layoutId,
        onPan,
        onPanStart,
        onPanEnd,
        onTap,
        viewport,
        ...props
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }: any, ref) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Tag = prop as any;
        return <Tag {...props} ref={ref}>{children}</Tag>;
      });
    }
  });

  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion,
  };
});

describe('IntensityScene', () => {
  it('renders correctly', () => {
    render(<IntensityScene intensity={100} index="moderate" />);
    // Check if the main container exists (it has role="img")
    expect(screen.getByRole('img')).toBeInTheDocument();
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
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

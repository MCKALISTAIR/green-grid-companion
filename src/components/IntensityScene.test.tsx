import { afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

const motionPrefs = vi.hoisted(() => ({ reduce: false }));
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => motionPrefs.reduce,
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

// BH-96 (Design brief Q1): a single or double tap on the sun only gives the small
// sun reaction; three taps within 1.5 s toggle synthwave, three more turn it off.
describe('IntensityScene sun taps (BH-96)', () => {
  const renderSunnyScene = () =>
    render(
      <IntensityScene
        intensity={100}
        index="low"
        timeOfDayOverride="midday"
        weatherOverride={{ condition: 'clear', cloudCover: 0 }}
      />,
    );
  const synthwave = () => screen.getByRole('region').getAttribute('data-synthwave');
  const sun = () => document.querySelector('[data-scene-sun-tap]') as HTMLElement;
  const tap = (n = 1) => {
    for (let i = 0; i < n; i += 1) fireEvent.pointerUp(sun());
  };
  const reaction = () =>
    document.querySelector('[data-sun-reaction]')?.getAttribute('data-sun-reaction');

  afterEach(() => {
    vi.useRealTimers();
    motionPrefs.reduce = false;
  });

  it('a single tap gives the sun reaction only, never synthwave', () => {
    renderSunnyScene();
    expect(synthwave()).toBe('off');
    expect(reaction()).toBe('off');
    tap(1);
    expect(reaction()).toBe('on');
    expect(synthwave()).toBe('off');
    expect(document.querySelector('[data-sun-sunglasses]')).toBeNull();
  });

  it('a double tap (and a dblclick) never toggles synthwave', () => {
    renderSunnyScene();
    tap(2);
    fireEvent.click(sun());
    fireEvent.click(sun());
    fireEvent.doubleClick(sun());
    expect(synthwave()).toBe('off');
  });

  it('a triple tap toggles synthwave on (sunglasses on), another triple tap turns it off', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T12:00:00+01:00'));
    renderSunnyScene();
    tap(3);
    expect(synthwave()).toBe('on');
    expect(document.querySelector('[data-sun-sunglasses]')).not.toBeNull();
    vi.advanceTimersByTime(2000);
    tap(1);
    expect(synthwave()).toBe('on'); // single tap while on: reaction only
    vi.advanceTimersByTime(2000);
    tap(3);
    expect(synthwave()).toBe('off');
    expect(document.querySelector('[data-sun-sunglasses]')).toBeNull();
  });

  it('three taps spread over 1.6 s do not toggle synthwave', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T12:00:00+01:00'));
    renderSunnyScene();
    tap(1);
    vi.advanceTimersByTime(800);
    tap(1);
    vi.advanceTimersByTime(800);
    tap(1);
    expect(synthwave()).toBe('off');
  });

  it('under Reduce Motion a tap gives no scale reaction, and a triple tap still works', () => {
    motionPrefs.reduce = true;
    renderSunnyScene();
    tap(1);
    expect(reaction()).toBe('off');
    tap(2);
    expect(synthwave()).toBe('on');
  });

  it('the sun is not exposed to VoiceOver or the keyboard, and has no CSS filter', () => {
    renderSunnyScene();
    const el = sun();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.hasAttribute('tabindex')).toBe(false);
    expect(el.hasAttribute('role')).toBe(false);
    fireEvent.keyDown(el, { key: 'Enter' });
    fireEvent.keyDown(el, { key: ' ' });
    expect(synthwave()).toBe('off');
    expect(screen.queryByRole('button', { name: /synthwave|sun/i })).toBeNull();
    const wrapper = el.closest('[data-scene-sun]') as HTMLElement;
    expect(wrapper.style.filter).toBe('');
  });

  it('synthwave starts off on every mount (not persisted)', () => {
    const first = renderSunnyScene();
    tap(3);
    expect(synthwave()).toBe('on');
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/synthwave/i);
    first.unmount();
    renderSunnyScene();
    expect(synthwave()).toBe('off');
  });
});

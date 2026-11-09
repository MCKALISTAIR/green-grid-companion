import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: { hide: vi.fn().mockResolvedValue(undefined) },
}));

import { SplashScreen, SPLASH_CAP_MS, SPLASH_FADE_MS } from './SplashScreen';
import { resetFirstContentForTests, signalFirstContent } from '@/lib/firstContent';

describe('SplashScreen', () => {
  beforeEach(() => {
    window.localStorage.setItem('onboarding_complete', 'true');
    vi.useFakeTimers();
    resetFirstContentForTests();
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('has no minimum: fades as soon as first content is signalled', () => {
    const done = vi.fn();
    render(<SplashScreen onComplete={done} />);
    act(() => {
      vi.advanceTimersByTime(50);
      signalFirstContent();
      vi.advanceTimersByTime(SPLASH_FADE_MS);
    });
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('is capped at 1.2s when no content arrives', () => {
    const done = vi.fn();
    render(<SplashScreen onComplete={done} />);
    act(() => vi.advanceTimersByTime(SPLASH_CAP_MS - 1));
    expect(done).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1 + SPLASH_FADE_MS));
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('fades immediately if content painted before the splash mounted', () => {
    signalFirstContent();
    const done = vi.fn();
    render(<SplashScreen onComplete={done} />);
    act(() => vi.advanceTimersByTime(SPLASH_FADE_MS));
    expect(done).toHaveBeenCalledTimes(1);
  });
});

describe('static first-screen handoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetFirstContentForTests();
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('keeps the static introduction intact before Home has content', () => {
    window.localStorage.setItem('onboarding_complete', 'true');
    const done = vi.fn();
    const { container } = render(<SplashScreen onComplete={done} />);
    expect(container).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(SPLASH_CAP_MS - 1));
    expect(done).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1 + SPLASH_FADE_MS));
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('does not recreate the web splash while Home is readying its content', () => {
    expect(document.querySelector('.gs-splash')).toBeNull();
  });

  it('opens onboarding without delaying behind a loading splash', () => {
    const done = vi.fn();
    render(<SplashScreen onComplete={done} />);
    expect(done).toHaveBeenCalledTimes(1);
  });
});

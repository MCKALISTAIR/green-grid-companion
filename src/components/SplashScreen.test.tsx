import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: { hide: vi.fn().mockResolvedValue(undefined) },
}));

import { SplashScreen, SPLASH_CAP_MS, SPLASH_FADE_MS } from './SplashScreen';
import { resetFirstContentForTests, signalFirstContent } from '@/lib/firstContent';

describe('SplashScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetFirstContentForTests();
  });
  afterEach(() => vi.useRealTimers());

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

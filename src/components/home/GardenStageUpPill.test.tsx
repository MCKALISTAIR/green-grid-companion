import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

const impactLight = vi.fn();
vi.mock('@/hooks/useHaptics', () => ({ useHaptics: () => ({ impactLight }) }));

import { GardenStageUpPill } from './GardenStageUpPill';
import { GARDEN_NOTICE_VISIBLE_MS } from '@/hooks/useGardenStageUpNotice';

type Cb = (entries: { isIntersecting: boolean }[]) => void;
let observers: Cb[] = [];
class FakeIO {
  cb: Cb;
  constructor(cb: Cb) {
    this.cb = cb;
    observers.push(cb);
  }
  observe() {}
  disconnect() {}
}
const intersect = () => act(() => observers.forEach((cb) => cb([{ isIntersecting: true }])));
const KEY = 'scene-garden-last-seen-stage-v1';

describe('GardenStageUpPill', () => {
  beforeEach(() => {
    localStorage.clear();
    observers = [];
    impactLight.mockClear();
    vi.stubGlobal('IntersectionObserver', FakeIO);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the unchanged copy and waits for it to come into view before timing out', () => {
    render(<GardenStageUpPill growthStage={3} gardenDays={12} enabled />);
    expect(screen.getByTestId('scene-garden-stage-up')).toHaveTextContent(
      'Garden is lush · 12 of 14 days low carbon',
    );
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.queryByTestId('scene-garden-stage-up')).not.toBeNull();
    expect(impactLight).not.toHaveBeenCalled();

    intersect();
    expect(impactLight).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(GARDEN_NOTICE_VISIBLE_MS - 100);
    });
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(localStorage.getItem(KEY)).toBe('3');
  });

  it('is 8 seconds', () => {
    expect(GARDEN_NOTICE_VISIBLE_MS).toBe(8000);
  });

  it('fires the haptic once even if it comes into view again', () => {
    render(<GardenStageUpPill growthStage={2} gardenDays={4} enabled />);
    intersect();
    intersect();
    expect(impactLight).toHaveBeenCalledTimes(1);
  });

  it('dismisses on tap', () => {
    render(<GardenStageUpPill growthStage={2} gardenDays={4} enabled />);
    fireEvent.click(screen.getByTestId('scene-garden-stage-up'));
    expect(localStorage.getItem(KEY)).toBe('2');
  });

  it('never renders in the city scene, and no haptic', () => {
    render(<GardenStageUpPill growthStage={3} gardenDays={12} enabled={false} />);
    intersect();
    expect(screen.queryByTestId('scene-garden-stage-up')).toBeNull();
    expect(impactLight).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

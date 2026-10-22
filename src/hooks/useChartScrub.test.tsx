import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';

const calls: string[] = [];
vi.mock('@/lib/haptics', () => ({
  hapticSelectionStart: () => calls.push('start'),
  hapticSelectionChanged: () => calls.push('changed'),
  hapticSelectionEnd: () => calls.push('end'),
}));

import { useChartScrub, SCRUB_HOLD_MS } from './useChartScrub';

const onIndex = vi.fn();
const onClick = vi.fn();

function Strip() {
  const ref = useRef<HTMLDivElement>(null);
  const scrubbing = useChartScrub(ref, onIndex);
  return (
    <div ref={ref} data-testid="strip" data-scrubbing={scrubbing || undefined}>
      {[0, 1, 2, 3].map((i) => (
        <button key={i} data-slot-index={i} onClick={onClick} />
      ))}
    </div>
  );
}

function touch(el: Element, type: string, x: number, y = 0) {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    touches: { clientX: number; clientY: number }[];
  };
  Object.defineProperty(ev, 'touches', {
    value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }],
  });
  el.dispatchEvent(ev);
  return ev;
}

beforeEach(() => {
  vi.useFakeTimers();
  calls.length = 0;
  onIndex.mockClear();
  onClick.mockClear();
  // Slots are 56px wide starting at x=0.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const i = Number(this.dataset.slotIndex ?? 0);
    return { left: i * 56, width: 48, top: 0, height: 100 } as DOMRect;
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useChartScrub', () => {
  it('enters scrub after a 200ms hold, ticks once per slot, ends once, keeps the selection', () => {
    const { getByTestId } = render(<Strip />);
    const strip = getByTestId('strip');
    touch(strip, 'touchstart', 20);
    act(() => void vi.advanceTimersByTime(SCRUB_HOLD_MS));
    expect(strip.dataset.scrubbing).toBe('true');
    expect(onIndex).toHaveBeenLastCalledWith(0);

    vi.advanceTimersByTime(50);
    const move = touch(strip, 'touchmove', 80);
    expect(move.defaultPrevented).toBe(true);
    touch(strip, 'touchmove', 85); // same slot: no tick
    vi.advanceTimersByTime(50);
    touch(strip, 'touchmove', 140);
    act(() => void touch(strip, 'touchend', 140));

    expect(onIndex.mock.calls.map((c) => c[0])).toEqual([0, 1, 2]);
    expect(calls).toEqual(['start', 'changed', 'changed', 'end']);
    expect(strip.dataset.scrubbing).toBeUndefined();
  });

  it('throttles ticks to one per 40ms', () => {
    const { getByTestId } = render(<Strip />);
    const strip = getByTestId('strip');
    touch(strip, 'touchstart', 20);
    act(() => void vi.advanceTimersByTime(SCRUB_HOLD_MS));
    vi.advanceTimersByTime(50);
    touch(strip, 'touchmove', 80);
    touch(strip, 'touchmove', 140);
    touch(strip, 'touchmove', 190);
    expect(onIndex.mock.calls.map((c) => c[0])).toEqual([0, 1, 2, 3]);
    expect(calls.filter((c) => c === 'changed')).toHaveLength(1);
  });

  it('a horizontal swipe before the hold scrolls instead of scrubbing', () => {
    const { getByTestId } = render(<Strip />);
    const strip = getByTestId('strip');
    touch(strip, 'touchstart', 20);
    const move = touch(strip, 'touchmove', 60);
    act(() => void vi.advanceTimersByTime(SCRUB_HOLD_MS * 2));
    expect(move.defaultPrevented).toBe(false);
    expect(strip.dataset.scrubbing).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it('swallows the click that follows a scrub release', () => {
    const { getByTestId } = render(<Strip />);
    const strip = getByTestId('strip');
    touch(strip, 'touchstart', 20);
    act(() => void vi.advanceTimersByTime(SCRUB_HOLD_MS));
    act(() => void touch(strip, 'touchend', 20));
    strip.querySelector('button')!.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});

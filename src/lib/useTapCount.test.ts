import { describe, expect, it } from 'vitest';
import { registerTap, SYNTHWAVE_TAP_WINDOW_MS } from './useTapCount';

/** Feeds tap times through registerTap; returns how many gestures completed. */
function completions(times: number[]): number {
  let taps: number[] = [];
  let count = 0;
  for (const t of times) {
    const r = registerTap(taps, t);
    taps = r.taps;
    if (r.complete) count += 1;
  }
  return count;
}

describe('registerTap, sun synthwave gesture (BH-96)', () => {
  it('a single tap never completes', () => {
    expect(completions([1000])).toBe(0);
  });

  it('a double tap never completes', () => {
    expect(completions([1000, 1150])).toBe(0);
  });

  it('three taps within 1.5 s of the first complete once', () => {
    expect(completions([1000, 1200, 1400])).toBe(1);
    expect(completions([1000, 1700, 1000 + SYNTHWAVE_TAP_WINDOW_MS - 1])).toBe(1);
  });

  it('three taps spread over 1.6 s do not complete', () => {
    expect(completions([1000, 1800, 2600])).toBe(0);
    expect(completions([1000, 1800, 1000 + SYNTHWAVE_TAP_WINDOW_MS])).toBe(0);
    expect(completions([0, 1000, 2000, 3000, 4000])).toBe(0);
  });

  it('a second triple tap completes again (synthwave off)', () => {
    expect(completions([1000, 1100, 1200, 3000, 3100, 3200])).toBe(2);
  });

  it('a fourth quick tap starts a new count', () => {
    expect(completions([1000, 1100, 1200, 1300])).toBe(1);
    expect(completions([1000, 1100, 1200, 1300, 1400, 1500])).toBe(2);
  });

  it('repeated double taps never complete', () => {
    expect(completions([0, 150, 2000, 2150, 4000, 4150])).toBe(0);
  });

  it('supports other counts (e.g. a double tap)', () => {
    expect(registerTap([1000], 1200, 2).complete).toBe(true);
  });
});

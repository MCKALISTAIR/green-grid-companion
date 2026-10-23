import { useCallback, useRef } from 'react';

/**
 * BH-96 (Design brief Q1, 23 Oct 2026): count quick taps without `dblclick`.
 *
 * A gesture completes when `count` taps land within `windowMs`, measured from
 * the first tap. Counted on `pointerup`, because WKWebView fires `dblclick`
 * unreliably and a double tap used to fire click, click, dblclick.
 *
 * Used by the scene sun: every tap gives a small reaction, three taps within
 * 1.5 s toggle synthwave, and three more toggle it back.
 */
export const SYNTHWAVE_TAP_COUNT = 3;
export const SYNTHWAVE_TAP_WINDOW_MS = 1500;

export interface TapResult {
  /** Tap times (ms) still inside the window, to pass to the next call. */
  taps: number[];
  /** True when this tap completes the gesture. */
  complete: boolean;
}

export function registerTap(
  previous: readonly number[],
  now: number,
  count = SYNTHWAVE_TAP_COUNT,
  windowMs = SYNTHWAVE_TAP_WINDOW_MS,
): TapResult {
  const taps = [...previous.filter((t) => t <= now && now - t < windowMs), now];
  if (taps.length >= count) {
    // Reset, so a fourth quick tap starts a fresh count rather than completing again.
    return { taps: [], complete: true };
  }
  return { taps, complete: false };
}

/** Returns a function to call on every tap; it returns true when the gesture completes. */
export function useTapCount(
  count = SYNTHWAVE_TAP_COUNT,
  windowMs = SYNTHWAVE_TAP_WINDOW_MS,
): () => boolean {
  const taps = useRef<number[]>([]);
  return useCallback(() => {
    const result = registerTap(taps.current, Date.now(), count, windowMs);
    taps.current = result.taps;
    return result.complete;
  }, [count, windowMs]);
}

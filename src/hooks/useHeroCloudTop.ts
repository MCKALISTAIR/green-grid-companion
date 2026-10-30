import { useCallback, useLayoutEffect, useState } from 'react';
import { birdFlightBand, type BirdFlightBand } from '@/lib/birdFlightBand';

/** Village REDRAW-PLAN / CONTRAST.md guard rail: clouds no higher than text bottom + 34. */
export const CLOUD_TEXT_CLEARANCE = 34;

/**
 * BH-90: where the unknown-weather cloud bank may start, in px from the top of
 * the hero scene: the bottom of the hero text block + 34. Re-measured whenever
 * either box resizes (state changes, Dynamic Type, rotation).
 *
 * BH-116: also the lane ambient birds may fly in (below the hero text + 12 px),
 * or null when there is no room or nothing is measured yet, so birds never
 * cross the hero text, even before the first measurement.
 */
export function useHeroCloudTop() {
  const [scene, setScene] = useState<HTMLElement | null>(null);
  const [text, setText] = useState<HTMLElement | null>(null);
  const [cloudTopPx, setCloudTopPx] = useState<number | undefined>(undefined);
  const [birdBand, setBirdBand] = useState<BirdFlightBand | null>(null);

  const sceneRef = useCallback((el: HTMLElement | null) => setScene(el), []);
  const textRef = useCallback((el: HTMLElement | null) => setText(el), []);

  // G-11: measure before paint, so the bank's first frame is already at its
  // reserved position (it used to paint once at the 40% fallback, then jump).
  useLayoutEffect(() => {
    if (!scene || !text) {
      setCloudTopPx(undefined);
      setBirdBand(null);
      return;
    }
    const measure = () => {
      const sceneBox = scene.getBoundingClientRect();
      const bottom = text.getBoundingClientRect().bottom;
      const next = Math.ceil(bottom - sceneBox.top + CLOUD_TEXT_CLEARANCE);
      setCloudTopPx((prev) => (prev === next ? prev : next));
      const band = birdFlightBand(bottom - sceneBox.top, sceneBox.height);
      setBirdBand((prev) =>
        prev?.minTopPx === band?.minTopPx && prev?.maxTopPx === band?.maxTopPx ? prev : band,
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(scene);
    ro.observe(text);
    return () => ro.disconnect();
  }, [scene, text]);

  return { sceneRef, textRef, cloudTopPx, birdBand };
}

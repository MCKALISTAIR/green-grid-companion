import { useCallback, useEffect, useState } from 'react';

/** Village REDRAW-PLAN / CONTRAST.md guard rail: clouds no higher than text bottom + 34. */
export const CLOUD_TEXT_CLEARANCE = 34;

/**
 * BH-90: where the unknown-weather cloud bank may start, in px from the top of
 * the hero scene: the bottom of the hero text block + 34. Re-measured whenever
 * either box resizes (state changes, Dynamic Type, rotation).
 */
export function useHeroCloudTop() {
  const [scene, setScene] = useState<HTMLElement | null>(null);
  const [text, setText] = useState<HTMLElement | null>(null);
  const [cloudTopPx, setCloudTopPx] = useState<number | undefined>(undefined);

  const sceneRef = useCallback((el: HTMLElement | null) => setScene(el), []);
  const textRef = useCallback((el: HTMLElement | null) => setText(el), []);

  useEffect(() => {
    if (!scene || !text) {
      setCloudTopPx(undefined);
      return;
    }
    const measure = () => {
      const top = scene.getBoundingClientRect().top;
      const bottom = text.getBoundingClientRect().bottom;
      const next = Math.ceil(bottom - top + CLOUD_TEXT_CLEARANCE);
      setCloudTopPx((prev) => (prev === next ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(scene);
    ro.observe(text);
    return () => ro.disconnect();
  }, [scene, text]);

  return { sceneRef, textRef, cloudTopPx };
}

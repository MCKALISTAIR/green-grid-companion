import { useEffect, useRef, useState, type RefObject } from 'react';
import { hapticSelectionChanged, hapticSelectionEnd, hapticSelectionStart } from '@/lib/haptics';

/** Hold this long without moving to enter scrub mode. */
export const SCRUB_HOLD_MS = 200;
/** Movement before the hold fires means the user is scrolling the strip. */
export const SCRUB_SLOP_PX = 8;
/** Ticks closer together than this are dropped (fast scrubs would buzz constantly). */
export const SCRUB_TICK_MIN_MS = 40;

/** Index of the slot under clientX. Slots carry data-slot-index; nearest centre wins. */
export function slotIndexAt(container: HTMLElement, clientX: number): number | null {
  const slots = container.querySelectorAll<HTMLElement>('[data-slot-index]');
  let best: number | null = null;
  let bestDist = Infinity;
  slots.forEach((el) => {
    const r = el.getBoundingClientRect();
    const dist = Math.abs(clientX - (r.left + r.width / 2));
    if (dist < bestDist) {
      bestDist = dist;
      best = Number(el.dataset.slotIndex);
    }
  });
  return best;
}

/**
 * Press-and-hold scrubbing over the forecast strip. Native listeners, because
 * React's touchmove is passive and can't stop the strip scrolling mid-scrub.
 * One selectionStart/End pair per gesture, a selectionChanged per half-hour slot.
 */
export function useChartScrub(
  containerRef: RefObject<HTMLElement>,
  onIndex: (index: number) => void,
): boolean {
  const [scrubbing, setScrubbing] = useState(false);
  const onIndexRef = useRef(onIndex);
  onIndexRef.current = onIndex;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let start: { x: number; y: number } | null = null;
    let lastX = 0;
    let active = false;
    let current: number | null = null;
    let lastTick = 0;
    let swallowClick = false;

    const moveTo = (x: number, tick: boolean) => {
      const i = slotIndexAt(el, x);
      if (i === null || i === current) return;
      current = i;
      onIndexRef.current(i);
      const now = performance.now();
      if (tick && now - lastTick >= SCRUB_TICK_MIN_MS) {
        lastTick = now;
        void hapticSelectionChanged();
      }
    };
    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return clear();
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
      lastX = t.clientX;
      current = null;
      clear();
      timer = setTimeout(() => {
        active = true;
        setScrubbing(true);
        void hapticSelectionStart();
        lastTick = performance.now();
        moveTo(lastX, false);
      }, SCRUB_HOLD_MS);
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || !start) return;
      lastX = t.clientX;
      if (!active) {
        if (Math.hypot(t.clientX - start.x, t.clientY - start.y) > SCRUB_SLOP_PX) clear();
        return;
      }
      if (e.cancelable) e.preventDefault();
      moveTo(t.clientX, true);
    };
    const onEnd = () => {
      clear();
      start = null;
      if (!active) return;
      active = false;
      swallowClick = true;
      setScrubbing(false);
      void hapticSelectionEnd();
      // The release would otherwise click the slot and buzz again.
      setTimeout(() => (swallowClick = false), 400);
    };
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.stopPropagation();
      e.preventDefault();
    };
    const onContextMenu = (e: Event) => {
      if (active || timer) e.preventDefault();
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    el.addEventListener('click', onClick, true);
    el.addEventListener('contextmenu', onContextMenu);
    return () => {
      clear();
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
      el.removeEventListener('click', onClick, true);
      el.removeEventListener('contextmenu', onContextMenu);
    };
  }, [containerRef]);

  return scrubbing;
}

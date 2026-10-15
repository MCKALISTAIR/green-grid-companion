import { useSyncExternalStore } from 'react';

/**
 * The hero exposes a slot under the location chip for compact status pills
 * (offline / back online). Status components portal into it when Home is
 * mounted and fall back to a floating pill elsewhere.
 */
let slot: HTMLElement | null = null;
const listeners = new Set<() => void>();

export function setHeroStatusSlot(el: HTMLElement | null): void {
  if (slot === el) return;
  slot = el;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useHeroStatusSlot(): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => slot,
    () => null,
  );
}

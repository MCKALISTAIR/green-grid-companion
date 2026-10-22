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

/**
 * Home's full offline state (no cached figures at all) is on screen. The
 * offline pill stays hidden while it is, so the two never say the same thing.
 */
let offlineEmptyShown = false;
const emptyListeners = new Set<() => void>();

export function setOfflineEmptyStateShown(shown: boolean): void {
  if (offlineEmptyShown === shown) return;
  offlineEmptyShown = shown;
  emptyListeners.forEach((l) => l());
}

export function useOfflineEmptyStateShown(): boolean {
  return useSyncExternalStore(
    (l) => {
      emptyListeners.add(l);
      return () => {
        emptyListeners.delete(l);
      };
    },
    () => offlineEmptyShown,
    () => false,
  );
}

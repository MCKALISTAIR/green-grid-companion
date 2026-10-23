import { useSyncExternalStore } from 'react';

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

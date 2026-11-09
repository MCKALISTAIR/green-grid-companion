import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

function subscribe(cb: () => void) {
  const mql = window.matchMedia?.(MOBILE_QUERY);
  mql?.addEventListener('change', cb);
  return () => mql?.removeEventListener('change', cb);
}

export function useIsSheetLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !!window.matchMedia?.(MOBILE_QUERY).matches,
    () => false,
  );
}

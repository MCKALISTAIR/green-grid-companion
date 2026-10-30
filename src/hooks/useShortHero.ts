import { useSyncExternalStore } from 'react';

/**
 * D-05 (Design, 30 Oct 2026): the compact hero for heights of 640px or less (the
 * iPhone Duo cover, SE-class phones, landscape phones). Matches the
 * `@media (max-height: 640px)` block in index.css. Read synchronously on the first
 * render, so the layout doesn't swap after paint.
 */
export const SHORT_HERO_QUERY = '(max-height: 640px)';

function subscribe(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(SHORT_HERO_QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

function getSnapshot() {
  return typeof window !== 'undefined' && !!window.matchMedia?.(SHORT_HERO_QUERY).matches;
}

export function useShortHero() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

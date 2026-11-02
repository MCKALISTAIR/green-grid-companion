/**
 * Primary bottom/side nav paths in left→right dock order.
 * Used for directional page slides — keep in sync with BottomNav / SideNav.
 */
export const MAIN_TAB_PATHS = ['/', '/planner', '/history', '/map', '/settings'] as const;

export type MainTabPath = (typeof MAIN_TAB_PATHS)[number];

export type NavSlideDirection = 'right' | 'left' | 'fade';

export function getNavSlideDirection(fromPath: string, toPath: string): NavSlideDirection {
  if (fromPath === toPath) return 'fade';

  const toIndex = MAIN_TAB_PATHS.indexOf(toPath as MainTabPath);
  const fromIndex = MAIN_TAB_PATHS.indexOf(fromPath as MainTabPath);

  if (toIndex !== -1 && fromIndex !== -1) {
    return toIndex > fromIndex ? 'right' : 'left';
  }

  return 'fade';
}

/** Warm a primary tab chunk on hover/focus (primary tabs are eagerly bundled with App.tsx). */
export function prefetchMainTab(_path: string) {
  // Primary tabs are already eagerly bundled with App.tsx to ensure
  // seamless 60fps dock slide transitions without mid-flight suspense.
}

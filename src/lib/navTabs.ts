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

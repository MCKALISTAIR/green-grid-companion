export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'vite-ui-theme';
export const THEME_COLOR_LIGHT = '#f1f7f9';
export const THEME_COLOR_DARK = '#131820';

/** Read the OS / accessibility-forced appearance the browser currently reports. */
export function getSystemTheme(
  matchMedia: (query: string) => MediaQueryList = window.matchMedia,
): ResolvedTheme {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(
  preference: ThemePreference,
  matchMedia?: (query: string) => MediaQueryList,
): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return getSystemTheme(matchMedia);
}

/**
 * Apply the resolved appearance to <html> so Tailwind `dark:` variants, native
 * form chrome (`color-scheme`), and the browser toolbar colour stay in sync —
 * including when iOS/Android force light/dark after first paint.
 */
export function applyResolvedTheme(
  resolved: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  syncThemeColorMeta(resolved);
}

/** Keep <meta name="theme-color"> aligned with the app theme, not only OS media. */
export function syncThemeColorMeta(resolved: ResolvedTheme, doc: Document = document): void {
  const color = resolved === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
  const metas = doc.querySelectorAll('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = doc.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', color);
    doc.head.appendChild(meta);
    return;
  }
  metas.forEach((meta) => {
    // Drop media queries so an explicit in-app light/dark choice isn't overridden
    // when the OS forces the opposite appearance.
    meta.removeAttribute('media');
    meta.setAttribute('content', color);
  });
}

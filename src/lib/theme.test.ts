import { describe, expect, it, vi } from 'vitest';
import {
  applyResolvedTheme,
  getSystemTheme,
  resolveTheme,
  syncThemeColorMeta,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
} from './theme';

function mockMatchMedia(dark: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches: dark && query.includes('prefers-color-scheme: dark'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

describe('theme resolve helpers', () => {
  it('reads the system appearance the browser reports (incl. OS force)', () => {
    expect(getSystemTheme(mockMatchMedia(true))).toBe('dark');
    expect(getSystemTheme(mockMatchMedia(false))).toBe('light');
  });

  it('lets an explicit preference win over a forced OS scheme', () => {
    expect(resolveTheme('light', mockMatchMedia(true))).toBe('light');
    expect(resolveTheme('dark', mockMatchMedia(false))).toBe('dark');
    expect(resolveTheme('system', mockMatchMedia(true))).toBe('dark');
    expect(resolveTheme('system', mockMatchMedia(false))).toBe('light');
  });

  it('applies class + color-scheme on the root', () => {
    const root = document.createElement('html');
    root.classList.add('light');
    applyResolvedTheme('dark', root);
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.classList.contains('light')).toBe(false);
    expect(root.style.colorScheme).toBe('dark');
  });

  it('syncs theme-color metas and clears media overrides', () => {
    const doc = document.implementation.createHTMLDocument('theme');
    const darkMeta = doc.createElement('meta');
    darkMeta.setAttribute('name', 'theme-color');
    darkMeta.setAttribute('media', '(prefers-color-scheme: dark)');
    darkMeta.setAttribute('content', '#000');
    const lightMeta = doc.createElement('meta');
    lightMeta.setAttribute('name', 'theme-color');
    lightMeta.setAttribute('media', '(prefers-color-scheme: light)');
    lightMeta.setAttribute('content', '#fff');
    doc.head.append(darkMeta, lightMeta);

    syncThemeColorMeta('light', doc);
    expect(darkMeta.getAttribute('media')).toBeNull();
    expect(lightMeta.getAttribute('media')).toBeNull();
    expect(darkMeta.getAttribute('content')).toBe(THEME_COLOR_LIGHT);
    expect(lightMeta.getAttribute('content')).toBe(THEME_COLOR_LIGHT);

    syncThemeColorMeta('dark', doc);
    expect(darkMeta.getAttribute('content')).toBe(THEME_COLOR_DARK);
  });
});

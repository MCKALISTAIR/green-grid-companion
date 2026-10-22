import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/** Opens an external URL in SFSafariViewController on native, a new tab on web (BH-51). */
export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url, presentationStyle: 'popover' });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** True for http(s) links that leave the app. */
export function isExternalHref(href: string, origin = window.location.origin): boolean {
  try {
    const u = new URL(href, origin);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin !== origin;
  } catch {
    return false;
  }
}

/**
 * On native, routes every external <a> tap through openExternal instead of letting
 * WKWebView hand it to Safari. Returns a cleanup function.
 */
export function installExternalLinkHandler(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || !isExternalHref(a.href)) return;
    e.preventDefault();
    void openExternal(a.href);
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}

import { APP_SCHEME, UNIVERSAL_LINK_HOST } from '@/config';
import { ROUTES } from '@/lib/routes';

/**
 * BH-145: turn an incoming native deep link into an in-app route.
 *
 * Accepts the GridSense:// scheme and https universal links on
 * getgridsense.com only. The sign-in tokens stay in the hash (never moved into
 * the query string), and AuthCallback only uses them if this device started a
 * sign-in. Returns null for anything we don't handle.
 */
export function deepLinkToRoute(raw: string): { pathname: string; hash: string } | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const scheme = url.protocol.toLowerCase();
  let pathname: string;
  if (scheme === `${APP_SCHEME.toLowerCase()}:`) {
    // GridSense://auth/callback parses with host "auth" and path "/callback".
    pathname = url.host ? `/${url.host}${url.pathname}` : url.pathname;
  } else if (scheme === 'https:' && url.hostname === UNIVERSAL_LINK_HOST) {
    pathname = url.pathname;
  } else {
    return null;
  }
  pathname = pathname.replace(/\/+$/, '') || '/';
  if (pathname !== ROUTES.AUTH_CALLBACK) return null;
  return { pathname, hash: url.hash };
}

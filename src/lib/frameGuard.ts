/**
 * BH-151: stop getgridsense.com being framed (clickjacking of Settings and
 * Delete account). The real fix is the `frame-ancestors 'none'` and
 * `X-Frame-Options: DENY` headers in public/_headers, but the host may ignore
 * that file and a <meta> CSP cannot set frame-ancestors, so the app also
 * refuses to render inside a frame on the production hosts.
 *
 * Lovable previews and local dev run the app in an iframe on purpose, so the
 * guard only applies to the hosts listed here.
 */
export const FRAME_PROTECTED_HOSTS = ['getgridsense.com', 'www.getgridsense.com'];

export interface FrameWindow {
  self: unknown;
  top: unknown;
  location: { hostname: string };
}

export function isFramed(win: FrameWindow): boolean {
  try {
    return win.self !== win.top;
  } catch {
    // Reading top across origins can throw: that means we are framed.
    return true;
  }
}

export function shouldBlockFraming(win: FrameWindow): boolean {
  return FRAME_PROTECTED_HOSTS.includes(win.location.hostname.toLowerCase()) && isFramed(win);
}

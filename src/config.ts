// App-wide configuration constants

// The custom URL scheme for the app (used for deep linking and OAuth redirects)
// This must match the CFBundleURLSchemes in Info.plist
export const APP_SCHEME = 'GridSense';

/**
 * BH-145: iOS universal links. The app claims https://getgridsense.com/auth/*
 * through public/.well-known/apple-app-site-association and the
 * associated-domains entitlement, so no other app can grab the callback.
 * Leave USE_UNIVERSAL_LINK_AUTH false until the AASA file is live on
 * getgridsense.com and sign-in has been tested on a device; then flip it so
 * native sign-in returns to https://getgridsense.com/auth/callback instead of
 * the GridSense:// scheme.
 */
export const UNIVERSAL_LINK_HOST = 'getgridsense.com';
export const USE_UNIVERSAL_LINK_AUTH = false;

/** Where the OAuth broker should send a native sign-in back to. */
export function nativeAuthRedirectUri(): string {
  return USE_UNIVERSAL_LINK_AUTH
    ? `https://${UNIVERSAL_LINK_HOST}/auth/callback`
    : `${APP_SCHEME}://auth/callback`;
}

/**
 * Product feature flags. Keep dormant integrations behind these so we can
 * revive them without resurrecting half-wired UI/docs.
 */
export const FEATURES = {
  /** Tesla Fleet API / vehicle planner — parked; not offered in product. */
  tesla: false,
} as const;

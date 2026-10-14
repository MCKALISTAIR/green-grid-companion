// App-wide configuration constants

// The custom URL scheme for the app (used for deep linking and OAuth redirects)
// This must match the CFBundleURLSchemes in Info.plist
export const APP_SCHEME = 'GridSense';

/**
 * Product feature flags. Keep dormant integrations behind these so we can
 * revive them without resurrecting half-wired UI/docs.
 */
export const FEATURES = {
  /** Tesla Fleet API / vehicle planner — parked; not offered in product. */
  tesla: false,
} as const;

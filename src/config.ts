/**
 * Product feature flags. Keep dormant integrations behind these so we can
 * revive them without resurrecting half-wired UI/docs.
 */
export const FEATURES = {
  /** Tesla Fleet API / vehicle planner — parked; not offered in product. */
  tesla: false,
} as const;

/** Layout constants for the Rank tab UKMap (kept out of the component for fast refresh). */

/** Marker radius (w-10 / 2), in px. Markers are clamped this far inside the frame. */
export const MARKER_R = 20;

/** Marker `left`, clamped so the whole marker stays inside the map frame. */
export const markerLeft = (xPct: number, offsetPx: number) =>
  `clamp(${MARKER_R}px, calc(${xPct}% + ${offsetPx}px), calc(100% - ${MARKER_R}px))`;

/**
 * Cap the map's width so its full height (aspect 0.61) plus the southern markers
 * (mb-12) clear the fixed bottom nav and the safe area on first paint. 9rem covers
 * the page header above the map. Never narrower than 13rem: on short screens the
 * page scrolls and the nav (z-50) paints over the map.
 */
export const MAP_MAX_WIDTH =
  'min(24rem, max(13rem, calc((100dvh - var(--bottom-content-inset, 0px) - 9rem - 3rem) * 0.61)))';

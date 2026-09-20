/**
 * Shared scene-height math for IntensityScene and visual QA.
 *
 * Tuned for both tall modern iPhones and iPhone Duo's squat ~1.42:1
 * cover/inner viewports. Keep in sync with the CSS clamp in
 * IntensityScene and the `.home-scene` rules in index.css.
 */

export const SCENE_HEIGHT_FLOOR_PX = 280;
export const SCENE_HEIGHT_CLASSIC_FLOOR_PX = 400;
export const SCENE_HEIGHT_CAP_PX = 620;
/** Aspect below this (~Duo 1.42:1) uses the short-viewport floor. */
export const SCENE_SHORT_ASPECT = 1.55;

/** Estimated CSS logical sizes for iPhone Duo (3x). */
export const IPHONE_DUO_VIEWPORTS = {
  cover: { label: 'iPhone Duo Cover', width: 466, height: 678, aspect: '1.42:1' },
  coverLandscape: { label: 'iPhone Duo Cover Landscape', width: 678, height: 466, aspect: '1.42:1' },
  inner: { label: 'iPhone Duo Inner', width: 890, height: 626, aspect: '1.42:1' },
  innerPortrait: { label: 'iPhone Duo Inner Portrait', width: 626, height: 890, aspect: '1.42:1' },
  splitView: { label: 'iPhone Duo Split View', width: 445, height: 626, aspect: '~half inner' },
} as const;

export function isShortWideViewport(viewportWidth: number, viewportHeight: number): boolean {
  if (viewportWidth <= 0) return false;
  return viewportHeight / viewportWidth < SCENE_SHORT_ASPECT || viewportHeight <= 640;
}

/**
 * Intrinsic scene height for a viewport, matching the CSS:
 * clamp(min(280px, 45dvh), min(55dvh, 75vw), min(620px, 70dvh))
 * with a raised floor on tall phones so classic iPhones stay ~400px+.
 */
export function getSceneIntrinsicHeight(viewportWidth: number, viewportHeight: number): number {
  const shortViewport = isShortWideViewport(viewportWidth, viewportHeight);
  const floor = shortViewport
    ? Math.min(SCENE_HEIGHT_FLOOR_PX, viewportHeight * 0.45)
    : SCENE_HEIGHT_CLASSIC_FLOOR_PX;
  const preferred = Math.min(viewportHeight * 0.55, viewportWidth * 0.75);
  const cap = Math.min(SCENE_HEIGHT_CAP_PX, viewportHeight * 0.7);
  return Math.min(cap, Math.max(floor, preferred));
}

/** CSS value used by IntensityScene when no style override is passed. */
export const SCENE_HEIGHT_CSS =
  'clamp(min(280px, 45dvh), min(55dvh, 75vw), min(620px, 70dvh))';

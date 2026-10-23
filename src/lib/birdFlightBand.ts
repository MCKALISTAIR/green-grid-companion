/**
 * BH-116 (Design, 23 Oct 2026): ambient birds never cross the hero text box
 * plus 12 px padding, at any size. Birds fly straight across the whole scene,
 * so the only safe lane is below the hero text: from its bottom + 12 px down to
 * the lowest point birds may fly (75% of the scene height, above the skyline
 * and the sheet's edge). When the hero text leaves no room for that lane (tall
 * reading copy on short phones), birds are not drawn at all.
 */
export const BIRD_HERO_PADDING_PX = 12;
/** FlyingBird's box (w-4 h-4); its scale (0.6-1) only shrinks it about the centre. */
export const BIRD_BOX_PX = 16;
/** Lowest bird top as a share of the scene height (the old lane was 10-40%). */
export const BIRD_LANE_BOTTOM = 0.75;

export interface BirdFlightBand {
  /** Highest allowed bird top, px from the scene top. */
  minTopPx: number;
  /** Lowest allowed bird top, px from the scene top. */
  maxTopPx: number;
}

/**
 * The px lane for bird tops below the hero text, or null when there is no room.
 * @param heroTextBottomPx bottom of the hero text box, px from the scene top
 * @param sceneHeightPx the scene's height in px
 */
export function birdFlightBand(
  heroTextBottomPx: number,
  sceneHeightPx: number,
): BirdFlightBand | null {
  const minTopPx = Math.ceil(heroTextBottomPx + BIRD_HERO_PADDING_PX);
  const maxTopPx = Math.floor(sceneHeightPx * BIRD_LANE_BOTTOM - BIRD_BOX_PX);
  return maxTopPx >= minTopPx ? { minTopPx, maxTopPx } : null;
}

/**
 * Where one bird flies inside the lane. `topPct` is the bird's random 10-40%
 * top from IntensityScene's birdConfig; its place within that range is kept, so
 * birds stay spread out.
 */
export function birdTopInBand(band: BirdFlightBand, topPct: number): number {
  const t = Math.min(1, Math.max(0, (topPct - 10) / 30));
  return Math.round(band.minTopPx + t * (band.maxTopPx - band.minTopPx));
}

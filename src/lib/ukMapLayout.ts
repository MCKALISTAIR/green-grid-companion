/** Layout constants for the Rank tab UKMap (kept out of the component for fast refresh). */

/**
 * Cap the map's width so its full height (aspect 0.61) plus the southern markers
 * (mb-12) clear the fixed bottom nav and the safe area on first paint. 9rem covers
 * the page header above the map. Never narrower than 13rem: on short screens the
 * page scrolls and the nav (z-50) paints over the map.
 */
export const MAP_MAX_WIDTH =
  'min(24rem, max(13rem, calc((100dvh - var(--bottom-content-inset, 0px) - 9rem - 3rem) * 0.61)))';

/** Map frames narrower than this get the compact marker. */
export const NARROW_MAP_PX = 300;

export interface MarkerSize {
  /** Marker diameter in px. */
  size: number;
  /** Label font size in px (Design floor: 11). */
  font: number;
  /** Minimum clear gap between marker boxes, in px. Covers the 1.15x selected scale. */
  gap: number;
}

export const markerSizeFor = (mapWidth: number): MarkerSize =>
  mapWidth < NARROW_MAP_PX ? { size: 26, font: 11, gap: 4 } : { size: 40, font: 12, gap: 6 };

export interface MarkerAnchor {
  id: number;
  /** Where the region is on the map, in px from the frame's top left. */
  x: number;
  y: number;
}

export interface PlacedMarker extends MarkerAnchor {
  /** Where the marker is drawn (centre), in px. Equal to x/y unless it was nudged. */
  px: number;
  py: number;
  /** True when the marker moved far enough to need a leader line back to x/y. */
  leader: boolean;
}

/**
 * Nudge colliding markers apart so no two boxes (plus `gap`) overlap, keeping every
 * marker inside the w x h frame (with `bottomRoom` px allowed below it). Deterministic:
 * the same input always gives the same layout. Each pass pushes each overlapping pair
 * apart along its axis of least overlap, half each, then clamps to the frame.
 */
export function layoutMarkers(
  anchors: MarkerAnchor[],
  w: number,
  h: number,
  { size, gap }: Pick<MarkerSize, 'size' | 'gap'>,
  bottomRoom = 0,
): PlacedMarker[] {
  const r = size / 2;
  const min = size + gap;
  const pts = anchors.map((a) => ({ ...a, px: a.x, py: a.y }));
  const clamp = (p: (typeof pts)[number]) => {
    p.px = Math.min(Math.max(p.px, r), Math.max(r, w - r));
    p.py = Math.min(Math.max(p.py, r), Math.max(r, h + bottomRoom - r));
  };
  pts.forEach(clamp);
  for (let pass = 0; pass < 400; pass++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        const dx = b.px - a.px;
        const dy = b.py - a.py;
        const ox = min - Math.abs(dx);
        const oy = min - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        // Push along the axis that needs the smaller move; ties go vertical. +0.01 settles rounding.
        if (ox < oy) {
          const s = (dx === 0 ? (a.id < b.id ? 1 : -1) : Math.sign(dx)) * (ox / 2 + 0.01);
          a.px -= s;
          b.px += s;
        } else {
          const s = (dy === 0 ? (a.id < b.id ? 1 : -1) : Math.sign(dy)) * (oy / 2 + 0.01);
          a.py -= s;
          b.py += s;
        }
        clamp(a);
        clamp(b);
      }
    }
    if (!moved) break;
  }
  return pts.map((p) => ({ ...p, leader: Math.hypot(p.px - p.x, p.py - p.y) > r * 0.6 }));
}

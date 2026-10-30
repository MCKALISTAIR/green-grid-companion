/**
 * Where a first-run tip goes so it never covers the card it explains.
 *
 * driver.js centres the target in the viewport and, when neither side has room
 * for the tip, pins the tip 10px off the bottom of the screen, right over the
 * card (the "Now or wait" bug). This picks above or below the highlighted
 * stage, flips when the preferred side has no room, keeps `collisionPadding`
 * from the viewport edges, and asks for a scroll when the card and the tip
 * only fit together once the card moves. The card itself must stay fully
 * visible above the bottom nav (`navTop`).
 */
export interface TourBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TourPlacementInput {
  target: TourBox;
  tip: { width: number; height: number };
  viewport: { width: number; height: number };
  /** Top of the bottom nav, or the viewport height when there is none. */
  navTop: number;
  preferred?: 'top' | 'bottom';
  /** Gap between the highlighted stage and the tip. */
  gap?: number;
  /** driver.js stagePadding around the target. */
  stagePadding?: number;
  /** Minimum distance from the viewport edges. */
  collisionPadding?: number;
  /** When false (scroll/resize repaint), never ask to scroll. */
  allowScroll?: boolean;
}

export interface TourPlacement {
  side: 'top' | 'bottom';
  top: number;
  left: number;
  /** Pixels to scroll the page down (negative: up) before placing. */
  scrollBy: number;
}

export function planTourPopover({
  target,
  tip,
  viewport,
  navTop,
  preferred = 'top',
  gap = 16,
  stagePadding = 12,
  collisionPadding = 12,
  allowScroll = true,
}: TourPlacementInput): TourPlacement {
  const minY = collisionPadding;
  const maxY = viewport.height - collisionPadding;
  const cardMax = Math.min(navTop, viewport.height);

  const layout = (side: 'top' | 'bottom', s: number) => {
    const stageTop = target.top - s - stagePadding;
    const stageBottom = target.bottom - s + stagePadding;
    const top = side === 'top' ? stageTop - gap - tip.height : stageBottom + gap;
    const tipFits = top >= minY && top + tip.height <= maxY;
    const cardFits = target.top - s >= 0 && target.bottom - s <= cardMax;
    return { side, top, s, ok: tipFits && cardFits };
  };

  const other = preferred === 'top' ? 'bottom' : 'top';
  const candidates = [layout(preferred, 0), layout(other, 0)];
  if (allowScroll) {
    // Card just below a tip pinned to the top edge, or card at the top edge with the tip under it.
    candidates.push(layout('top', target.top - (minY + tip.height + gap + stagePadding)));
    candidates.push(layout('bottom', target.top - (minY + stagePadding)));
  }
  let pick = candidates.find((c) => c.ok);

  if (!pick) {
    // Nothing fits cleanly: use the side with more room without scrolling and clamp
    // the tip on screen (only reachable when the page cannot scroll the card clear).
    const above = target.top - stagePadding - gap - minY;
    const below = maxY - (target.bottom + stagePadding + gap);
    const side = above >= below ? 'top' : 'bottom';
    const raw = layout(side, 0).top;
    pick = {
      side,
      top: Math.max(minY, Math.min(raw, maxY - tip.height)),
      s: 0,
      ok: false,
    };
  }

  const centre = (target.left + target.right) / 2 - tip.width / 2;
  const left = Math.max(
    collisionPadding,
    Math.min(centre, viewport.width - collisionPadding - tip.width),
  );
  return { side: pick.side, top: Math.round(pick.top), left: Math.round(left), scrollBy: pick.s };
}

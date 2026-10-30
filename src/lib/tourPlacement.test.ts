import { describe, expect, it } from 'vitest';
import { planTourPopover, type TourBox } from './tourPlacement';

const box = (top: number, bottom: number, left = 16, right = 374): TourBox => ({
  top,
  bottom,
  left,
  right,
});
const overlaps = (a: TourBox, b: TourBox) =>
  Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) &&
  Math.min(a.right, b.right) > Math.max(a.left, b.left);

describe('planTourPopover', () => {
  const tip = { width: 300, height: 200 };
  const viewport = { width: 390, height: 844 };

  it('keeps the preferred side when there is room', () => {
    const p = planTourPopover({ target: box(400, 600), tip, viewport, navTop: 760 });
    expect(p).toMatchObject({ side: 'top', scrollBy: 0, top: 400 - 12 - 16 - 200 });
  });

  it('flips below when there is no room above', () => {
    const p = planTourPopover({ target: box(100, 300), tip, viewport, navTop: 760 });
    expect(p.side).toBe('bottom');
    expect(p.top).toBe(300 + 12 + 16);
    expect(p.scrollBy).toBe(0);
  });

  it('scrolls the card clear when neither side fits as it stands', () => {
    // driver.js centred a tall card with too little room on either side (bug screenshot).
    const target = box(220, 620);
    const p = planTourPopover({ target, tip, viewport, navTop: 760 });
    expect(p.scrollBy).not.toBe(0);
    const moved = box(target.top - p.scrollBy, target.bottom - p.scrollBy);
    const tipBox = box(p.top, p.top + tip.height, p.left, p.left + tip.width);
    expect(overlaps(tipBox, moved)).toBe(false);
    expect(moved.top).toBeGreaterThanOrEqual(0);
    expect(moved.bottom).toBeLessThanOrEqual(760);
    expect(tipBox.top).toBeGreaterThanOrEqual(12);
    expect(tipBox.bottom).toBeLessThanOrEqual(844 - 12);
  });

  it('keeps collisionPadding from the side edges on a 280px cover screen', () => {
    const p = planTourPopover({
      target: box(300, 500, 0, 280),
      tip: { width: 256, height: 180 },
      viewport: { width: 280, height: 653 },
      navTop: 590,
    });
    expect(p.left).toBe(12);
  });

  it('never asks to scroll on a repaint', () => {
    const p = planTourPopover({
      target: box(290, 640),
      tip,
      viewport,
      navTop: 760,
      allowScroll: false,
    });
    expect(p.scrollBy).toBe(0);
    expect(p.top).toBeGreaterThanOrEqual(12);
  });
});

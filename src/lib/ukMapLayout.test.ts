import { describe, expect, it } from 'vitest';
import { layoutMarkers, markerSizeFor } from './ukMapLayout';

const overlaps = (ps: { px: number; py: number }[], min: number) =>
  ps.some((a, i) =>
    ps.some((b, j) => j > i && Math.abs(a.px - b.px) < min && Math.abs(a.py - b.py) < min),
  );

describe('layoutMarkers', () => {
  it('pushes colliding markers apart by size + gap and flags a leader line', () => {
    const sz = { size: 26, gap: 4 };
    const out = layoutMarkers(
      [
        { id: 1, x: 100, y: 100 },
        { id: 2, x: 105, y: 108 },
        { id: 3, x: 100, y: 100 },
      ],
      208,
      341,
      sz,
    );
    expect(overlaps(out, 30 - 0.001)).toBe(false);
    expect(out.some((m) => m.leader)).toBe(true);
  });

  it('leaves well-spaced markers where they are, with no leader', () => {
    const out = layoutMarkers(
      [
        { id: 1, x: 40, y: 40 },
        { id: 2, x: 140, y: 140 },
      ],
      208,
      341,
      { size: 26, gap: 4 },
    );
    expect(out.map((m) => [m.px, m.py, m.leader])).toEqual([
      [40, 40, false],
      [140, 140, false],
    ]);
  });

  it('keeps markers inside the frame', () => {
    const out = layoutMarkers([{ id: 1, x: -10, y: 999 }], 208, 341, { size: 26, gap: 4 }, 48);
    expect(out[0].px).toBe(13);
    expect(out[0].py).toBe(341 + 48 - 13);
  });

  it('uses the compact 26px marker with an 11px label on narrow maps', () => {
    expect(markerSizeFor(208)).toEqual({ size: 26, font: 11, gap: 4 });
    expect(markerSizeFor(346)).toEqual({ size: 40, font: 12, gap: 6 });
  });
});

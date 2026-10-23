import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** Gap Design wants between the location row and the New badge pill (px). */
export const HERO_TOP_ROW_GAP = 8;

/**
 * True when the full "New badge" pill would not fit beside the location row
 * (chip + GB-average dot) at its natural width. Pure so it can be unit tested.
 */
export function needsCompactBadge(
  rowLeft: number,
  rowNaturalWidth: number,
  pillRight: number,
  fullPillWidth: number,
  gap: number = HERO_TOP_ROW_GAP,
): boolean {
  return rowLeft + rowNaturalWidth + gap > pillRight - fullPillWidth;
}

/**
 * Hero top row (Design call on #128): never wraps or truncates. Measures the
 * location row and an invisible copy of the full pill, and collapses the pill
 * to icon + count when they don't fit side by side.
 */
export function useHeroTopRowFit(active: boolean, deps: unknown[]) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const pillSlotRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [compact, setCompact] = useState(false);

  const measure = useCallback(() => {
    const row = rowRef.current;
    const slot = pillSlotRef.current;
    const full = measureRef.current;
    if (!active || !row || !slot || !full) return setCompact(false);
    if (row.getBoundingClientRect().width === 0) return setCompact(false); // desktop: row hidden
    const rowLeft = row.getBoundingClientRect().left;
    setCompact(
      needsCompactBadge(
        rowLeft,
        row.scrollWidth,
        slot.getBoundingClientRect().right,
        full.getBoundingClientRect().width,
      ),
    );
  }, [active]);

  useLayoutEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    if (rowRef.current) ro.observe(rowRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps: re-measure when the row's text changes
  }, [measure, ...deps]);

  return { rowRef, pillSlotRef, measureRef, compact };
}

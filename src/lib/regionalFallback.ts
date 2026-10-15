/** BH-29 copy (GridSense Design, 15 Oct 2026). Pill text at every width. */
export const REGIONAL_FALLBACK_LABEL = 'GB average';

/** aria-label and (i) popover text when the GB figure stands in for a region. */
export function regionalFallbackMessage(regionName: string | undefined): string {
  const name = regionName?.trim();
  if (!name) return "Your region's figure is unavailable right now, so this is the GB average.";
  return `${name} figure unavailable right now, so this is the GB average.`;
}

/**
 * Window-light hue for night / dusk / dawn: warm amber when clean,
 * sickly green-tinged when dirty (Phase 1 silhouette readability).
 */
export function getWindowLitColor(cleanliness: number, timeOfDay?: string): string {
  const dirty = Math.max(0, Math.min(1, (0.55 - cleanliness) / 0.55));

  if (timeOfDay === 'dawn') {
    // Soft gold → olive
    return dirty > 0.4 ? '#c4c45a' : '#fcd34d';
  }
  if (timeOfDay === 'sunset') {
    return dirty > 0.4 ? '#c4783c' : '#fb923c';
  }
  if (timeOfDay === 'dusk' || timeOfDay === 'night') {
    // Warm amber (#fbbf24) → sickly green (#a3b84a)
    if (dirty <= 0) return '#fbbf24';
    if (dirty >= 1) return '#9cb84a';
    // interpolate roughly via mid stop
    return dirty > 0.55 ? '#a8b84a' : dirty > 0.25 ? '#d4b84a' : '#fbbf24';
  }

  // Daytime: rare lit windows stay amber (already sparse)
  return dirty > 0.5 ? '#d4b84a' : '#fbbf24';
}

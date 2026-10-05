/**
 * Window-light hue for night / dusk / dawn: warm amber when clean,
 * sickly green-tinged when dirty (Phase 1 silhouette readability).
 */
export function getWindowLitColor(cleanliness: number, timeOfDay?: string): string {
  const dirty = Math.max(0, Math.min(1, (0.55 - cleanliness) / 0.55));

  if (timeOfDay === 'dawn') {
    // Soft gold → olive
    return dirty > 0.4 ? '#a8b84a' : '#fcd34d';
  }
  if (timeOfDay === 'sunset') {
    return dirty > 0.4 ? '#b8783c' : '#fb923c';
  }
  if (timeOfDay === 'dusk' || timeOfDay === 'night') {
    // Warm amber (#fbbf24) → clearly sickly green (#7a9e3a)
    if (dirty <= 0.15) return '#fbbf24';
    if (dirty <= 0.4) return '#d4b84a';
    if (dirty <= 0.7) return '#a8b84a';
    return '#7a9e3a';
  }

  // Daytime: rare lit windows stay amber (already sparse)
  return dirty > 0.5 ? '#c4b84a' : '#fbbf24';
}

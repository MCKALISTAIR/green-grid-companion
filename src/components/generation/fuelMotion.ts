/** Fuels with an icon animation (keyframes in index.css, `.fuel-anim--<fuel>`). */
const ANIMATED_FUELS = new Set(['wind', 'solar', 'gas', 'imports', 'interconnectors', 'nuclear', 'biomass', 'hydro']);

/**
 * Loop length for an active source, loosely tied to its share of the mix:
 * 4.4s at a sliver, down to 3.2s at 60%+. A subtle range, never frantic.
 */
export function fuelAnimationSeconds(perc: number): number {
  const share = Math.max(0, Math.min(perc, 60)) / 60;
  return Math.round((4.4 - share * 1.2) * 10) / 10;
}

/** Whether a source's icon should animate: active (share > 0) and motion allowed. */
export function isFuelIconAnimated(fuel: string, perc: number | undefined, motionAllowed: boolean): boolean {
  return motionAllowed && typeof perc === 'number' && perc > 0 && ANIMATED_FUELS.has(fuel.toLowerCase());
}

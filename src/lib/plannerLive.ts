/**
 * The live figure the Planner may compare against, or null if there isn't a
 * real one yet. A genuine 0 gCO₂/kWh (net zero) counts as a reading; it used
 * to be dropped because the check was `intensity > 0`.
 */
export function plannerLiveIntensity(
  intensity: number,
  state: { isLoading: boolean; isError: boolean; hasReading: boolean },
): number | null {
  if (state.isLoading || state.isError || !state.hasReading) return null;
  return Number.isFinite(intensity) && intensity >= 0 ? intensity : null;
}

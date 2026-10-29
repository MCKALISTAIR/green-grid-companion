/**
 * NESO carbon intensity index bands for 2026 (gCO2/kWh), from Table 2 of NESO's
 * Carbon Intensity API methodology: https://www.neso.energy/document/373936/download
 *
 *   very low 0-24 · low 25-89 · moderate 90-169 · high 170-230 · very high 231+
 *
 * BH-139: the hero label shows NESO's own index; the scene must use the same
 * bands, so everything that turns a number into a band goes through here.
 */
export type NesoBand = 'very low' | 'low' | 'moderate' | 'high' | 'very high';

export const NESO_BANDS_2026 = { veryLowMax: 24, lowMax: 89, moderateMax: 169, highMax: 230 };

export function nesoBand(intensity: number): NesoBand {
  const g = Math.round(intensity);
  if (g <= NESO_BANDS_2026.veryLowMax) return 'very low';
  if (g <= NESO_BANDS_2026.lowMax) return 'low';
  if (g <= NESO_BANDS_2026.moderateMax) return 'moderate';
  if (g <= NESO_BANDS_2026.highMax) return 'high';
  return 'very high';
}

const KNOWN = new Set<string>(['very low', 'low', 'moderate', 'high', 'very high']);

/** The label's band: NESO's published index when we have one, else the same 2026 bands. */
export function bandFor(intensity: number, index?: string | null): NesoBand {
  const k = (index || '').toLowerCase();
  return KNOWN.has(k) ? (k as NesoBand) : nesoBand(intensity);
}

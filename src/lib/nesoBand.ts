/**
 * NESO carbon intensity index bands for 2026 (gCO2/kWh), from Table 2 of NESO's
 * Carbon Intensity API methodology: https://www.neso.energy/document/373936/download
 *
 *   very low 0-24 · low 25-89 · moderate 90-169 · high 170-230 · very high 231+
 *
 * BH-139: the hero label and the scene must agree, so everything that turns a
 * number into a band goes through here. The grams decide the band; NESO's own
 * `index` can disagree with these thresholds (it is set from the forecast and
 * regional figures), so it is only a fallback when there is no number.
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

/** The band for a reading: the 2026 gram thresholds, or NESO's index only when there is no number. */
export function bandFor(intensity: number | null | undefined, index?: string | null): NesoBand {
  if (typeof intensity === 'number' && Number.isFinite(intensity)) return nesoBand(intensity);
  const k = (index || '').toLowerCase();
  return KNOWN.has(k) ? (k as NesoBand) : 'moderate';
}

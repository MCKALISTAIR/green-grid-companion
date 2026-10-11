/**
 * Hero condition labels — Carrot-style weather line for carbon intensity.
 * Official index names stay the default (friendly). Snarky variants are
 * opt-in via Settings → Commentary Style.
 */

export type ConditionTone = 'friendly' | 'snarky' | 'mixed';

const OFFICIAL: Record<string, string> = {
  'very low': 'Very low',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very high': 'Very high',
};

const SNARKY: Record<string, string[]> = {
  'very low': ['Sparkling clean', 'Grid is flexing', 'Proper pristine'],
  low: ['Breathing easy', 'Looking leafy', 'Green-ish vibes'],
  moderate: ['Meh territory', 'Could be greener', 'Mid-pack energy'],
  high: ['Looking grimy', 'Not great, Bob', 'Coal-adjacent'],
  'very high': ['Proper filthy', 'Hide the kettle', 'Air tastes beige'],
};

function normalizeIndex(index: string): string {
  return index.trim().toLowerCase();
}

/** Stable pick so the same band doesn't flicker every render. */
function pickVariant(variants: string[], salt: string): string {
  let hash = 0;
  for (let i = 0; i < salt.length; i++) {
    hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
  }
  return variants[hash % variants.length];
}

/**
 * Resolve the hero condition line for an intensity index + commentary tone.
 * Friendly → official NESO band name.
 * Snarky → witty Carrot-style label.
 * Mixed → snarky with a gentle official fallback if unknown.
 */
export function getConditionLabel(
  index: string | null | undefined,
  tone: ConditionTone,
  salt = '',
): string {
  if (!index) return '';
  const key = normalizeIndex(index);
  const official = OFFICIAL[key] ?? index;

  if (tone === 'friendly') return official;

  const variants = SNARKY[key];
  if (!variants?.length) return official;

  if (tone === 'snarky') {
    return pickVariant(variants, `${key}:${salt}`);
  }

  // Mixed: prefer snark ~60% of the time, keyed by day so it doesn't thrash
  const dayKey = new Date().toISOString().slice(0, 10);
  const roll = pickVariant(['snark', 'snark', 'official'], `${key}:${dayKey}:${salt}`);
  return roll === 'official' ? official : pickVariant(variants, `${key}:${dayKey}:${salt}`);
}

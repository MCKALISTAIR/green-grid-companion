/**
 * Hero condition labels: the official NESO band name, plus (Cheeky tone)
 * one short line about the grid. Keyed on the API's `index`, never on our
 * own thresholds, and the lines only say what the band says.
 *
 * Plain → "Very low"
 * Cheeky → "Very low. The grid's showing off."
 *
 * See /workspace/gridsense-voice-notes/voice-guide.md (approved 11 Oct 2026).
 */
import { normaliseTone, type CommentaryTone } from '@/lib/tone';
import { londonDateKey } from '@/lib/londonTime';

/** Current tones. Legacy values ('friendly' | 'snarky' | 'mixed') are still accepted and migrated to Cheeky. */
export type ConditionTone = CommentaryTone;

const OFFICIAL: Record<string, string> = {
  'very low': 'Very low',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very high': 'Very high',
};

/** Cheeky lines per band. No fuels, numbers, coal or air quality: the band is all we know here. */
export const CHEEKY_LINES: Record<string, readonly string[]> = {
  'very low': ["The grid's showing off.", 'Go on, run the big stuff.', 'Smug grid alert.'],
  low: ['Pretty tidy, this.', 'Not bad at all.', "The grid's behaving."],
  moderate: ['Middle of the road.', 'Neither smug nor sorry.', 'Could go either way.'],
  high: [
    "The grid's having a grumpy one.",
    'Worth waiting if you can.',
    "Not the grid's finest hour.",
  ],
  'very high': [
    "The grid's in a mood.",
    'Hold the big stuff if you can.',
    "Grid's having a shocker.",
  ],
};

function normalizeIndex(index: string): string {
  return index.trim().toLowerCase();
}

/** Stable pick so the same band doesn't flicker every render. */
function pickVariant(variants: readonly string[], salt: string): string {
  let hash = 0;
  for (let i = 0; i < salt.length; i++) {
    hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
  }
  return variants[hash % variants.length];
}

export interface ConditionParts {
  /** Official band name, e.g. "Very low". Empty when there's no index. */
  band: string;
  /** Cheeky line, e.g. "The grid's showing off." Null in Plain or for an unknown band. */
  quip: string | null;
}

/**
 * Band name and (Cheeky) line separately, for layouts that show a band pill
 * plus a line (the home redesign spec). The line is stable for a band, salt
 * and London calendar day, so it doesn't change on every refresh.
 */
export function getConditionParts(
  index: string | null | undefined,
  tone: ConditionTone | string,
  salt = '',
  now: Date = new Date(),
): ConditionParts {
  if (!index) return { band: '', quip: null };
  const key = normalizeIndex(index);
  const band = OFFICIAL[key] ?? index;
  if (normaliseTone(tone) === 'plain') return { band, quip: null };
  const variants = CHEEKY_LINES[key];
  if (!variants?.length) return { band, quip: null };
  return { band, quip: pickVariant(variants, `${key}:${londonDateKey(now)}:${salt}`) };
}

/**
 * One-line hero condition: "Very low" (Plain) or "Very low. The grid's showing off." (Cheeky).
 */
export function getConditionLabel(
  index: string | null | undefined,
  tone: ConditionTone | string,
  salt = '',
  now: Date = new Date(),
): string {
  const { band, quip } = getConditionParts(index, tone, salt, now);
  return quip ? `${band}. ${quip}` : band;
}

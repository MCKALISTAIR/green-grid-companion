/**
 * Commentary tone (Settings > Commentary Style).
 *
 * Two tones:
 * - 'cheeky': the default. Adds a short, true-to-the-data line after the
 *   band name, a tail on the Now-or-wait card, and cheekier notifications.
 * - 'plain': the official band names and straightforward copy.
 *
 * Numbers, times, advice and the Now-or-wait answer are identical in both.
 * Errors, permissions, settings and accessibility labels are plain in both.
 *
 * Stored under the existing 'gridgreen-fact-prefs' key so nobody loses their
 * choice. Older values are migrated:
 *   friendly -> cheeky  (the old hook saved 'friendly' for everyone on first
 *                        launch, so a deliberate Friendly choice can't be told
 *                        apart from the default; everyone moves to the new
 *                        default and can pick Plain in Settings)
 *   snarky   -> cheeky
 *   mixed    -> cheeky  (they had opted in to quips)
 *   missing  -> cheeky  (new users, approved default)
 * Only an explicit 'plain' (saved by this version) stays Plain.
 */
export type CommentaryTone = 'cheeky' | 'plain';

export const TONE_STORAGE_KEY = 'gridgreen-fact-prefs';
export const DEFAULT_TONE: CommentaryTone = 'cheeky';

/** Normalise any stored or legacy value to a current tone. */
export function normaliseTone(value: string | null | undefined): CommentaryTone {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'plain':
      return 'plain';
    case 'friendly':
    case 'cheeky':
    case 'snarky':
    case 'mixed':
      return 'cheeky';
    default:
      return DEFAULT_TONE;
  }
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Read the saved tone (migrating legacy values in place). */
export function readTone(): CommentaryTone {
  const store = storage();
  if (!store) return DEFAULT_TONE;
  const raw = store.getItem(TONE_STORAGE_KEY);
  const tone = normaliseTone(raw);
  if (raw !== null && raw !== tone) {
    try {
      store.setItem(TONE_STORAGE_KEY, tone);
    } catch {
      /* ignore quota / private mode */
    }
  }
  return tone;
}

export function writeTone(tone: CommentaryTone): void {
  try {
    storage()?.setItem(TONE_STORAGE_KEY, tone);
  } catch {
    /* ignore */
  }
}

/**
 * Which energy-fact pool a tone draws from. The fact list itself
 * (src/lib/energyFacts.ts) still uses its own 'friendly' / 'snarky' tags.
 * Cheeky draws from both pools, Plain only from the straightforward one.
 */
export function factPoolFor(tone: CommentaryTone): 'friendly' | 'mixed' {
  return tone === 'plain' ? 'friendly' : 'mixed';
}

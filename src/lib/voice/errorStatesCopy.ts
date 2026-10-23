/**
 * Design's error-state copy (artpass/errors/COPY.md). Plain is the base; the
 * Cheeky variant follows the tone setting. Delete, export, stale data,
 * postcode, session and splash are always Plain, whatever the setting.
 */
import type { CommentaryTone } from '@/lib/tone';
import { formatLondonTime } from '@/lib/londonTime';

interface ToneCopy {
  plain: string;
  cheeky?: string;
}

/** Plain unless the user picked Cheeky and the state has a Cheeky line. */
export function toneBody(copy: ToneCopy, tone: CommentaryTone): string {
  return tone === 'cheeky' && copy.cheeky ? copy.cheeky : copy.plain;
}

export const SLOW_COPY = {
  title: 'Still waiting for NESO',
  body: {
    plain: 'We have been waiting over 8 seconds. Your connection may be slow, or NESO may be busy.',
    cheeky: 'NESO is having a long think. Over 8 seconds so far.',
  },
  action: 'Try again',
} as const;

export const lastKnownChip = (at: Date) => `Last known · ${formatLondonTime(at)}`;

/** Always Plain. */
export const STALE_COPY = {
  title: 'This might be out of date',
  body: (at: Date) =>
    `We could not refresh, so you are seeing the figure from ${formatLondonTime(at)}. Plan with care.`,
  action: 'Retry',
} as const;

/** Only when our own API answers and NESO 5xx'd or timed out. */
export const OUTAGE_COPY = {
  heroTitle: "NESO isn't answering",
  title: 'Grid data unavailable',
  body: {
    plain:
      'The National Energy System Operator data feed is not responding. This is on their side, not your phone.',
    cheeky: 'NESO has gone quiet. Not your phone, promise.',
  },
  action: 'Try again',
} as const;

/** State 3: location outside GB (or a VPN). Follows the tone setting. */
export const OUTSIDE_COPY = {
  title: 'Outside Great Britain',
  body: {
    plain:
      'Your location looks like it is outside GB, or you are on a VPN. GridSense only covers the GB grid.',
    cheeky:
      'Bonjour? Your location looks like it is outside GB, or you are on a VPN. We only cover the GB grid.',
  },
  enterPostcode: 'Enter a GB postcode',
  useAverage: 'Use GB average',
  niNote: 'Northern Ireland runs on a separate grid, so it is not covered.',
} as const;

/** State 4: unknown postcode (inline field error). Always Plain. */
export const POSTCODE_COPY = {
  notFound: (outward: string) => `We couldn't find ${outward}. Check it, or use the GB average.`,
  tryAgain: 'Try again',
  useAverage: 'Use GB average',
/**
 * State 12: Offline with nothing cached at all (full Home state). When cached
 * figures are on screen the in-hero pill from #137 says "Offline · figures
 * from HH:MM" instead, so this card never shows alongside it.
 */
export const OFFLINE_COPY = {
  title: "You're offline.",
  body: {
    plain: 'Nothing saved yet.',
    cheeky: 'Nothing saved yet. The grid carries on without us.',
  },
  auto: 'We will refresh automatically when you are back online.',
  action: 'Try now',
} as const;

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
  /** Hero title when there's no reading and the device is offline (BH-80). */
  heroOffline: 'Offline',
} as const;

export const lastKnownChip = (at: Date) => `Last known · ${formatLondonTime(at)}`;

/** State 5: Rank map with no regional figures. Follows the tone setting. */
export const RANK_EMPTY_COPY = {
  title: 'No regional figures right now',
  body: {
    plain: 'NESO has not sent regional data yet. National figures are still available on Home.',
    cheeky: 'The regions are being shy. National figures are still on Home.',
  },
  action: 'Retry',
} as const;

/** Always Plain. */
export const STALE_COPY = {
  title: 'This might be out of date',
  body: (at: Date) =>
    `We could not refresh, so you are seeing the figure from ${formatLondonTime(at)}. Plan with care.`,
  action: 'Retry',
} as const;

/** State 6: Planner forecast error; the picker and selection stay. */
export const PLANNER_ERROR_COPY = {
  title: "Couldn't load the forecast",
  body: (appliance: string, tone: CommentaryTone) =>
    tone === 'cheeky'
      ? `Your ${appliance} choice is saved. The forecast is dragging its feet.`
      : 'Your choice is saved. We will find the best time as soon as the forecast loads.',
  action: 'Retry',
} as const;

/** Only when our own API answers and NESO 5xx'd or timed out. */
export const OUTAGE_COPY = {
  /**
   * Hero title when there's no reading, the device is online and the Carbon
   * Intensity API request itself failed: timeout, network error or 5xx (BH-80).
   */
  heroTitle: "NESO isn't answering",
  /** Hero title for any other failure with no reading: parsing, postcode lookup, our bugs (BH-80). */
  heroUnavailable: 'No reading right now',
  title: 'Grid data unavailable',
  body: {
    plain:
      'The National Energy System Operator data feed is not responding. This is on their side, not your phone.',
    cheeky: 'NESO has gone quiet. Not your phone, promise.',
  },
  action: 'Try again',
} as const;

/**
 * Northern Ireland, long version (Design call, BH-87): onboarding, the
 * outside-GB note, Help and the Demand popover. The short version, "Northern
 * Ireland is on the all-island grid", is OFF_GRID_HOME_COPY in statesCopy.
 */
export const NI_ALL_ISLAND_GRID =
  "Northern Ireland is on the all-island grid it shares with Ireland, which this data doesn't cover.";

/**
 * Hero title when there's no reading (Design call, BH-80): "Offline" when the
 * device is; "NESO isn't answering" only when the Carbon Intensity API request
 * itself failed (timeout, network error, 5xx); otherwise a neutral line.
 */
export function heroErrorTitle(isOffline: boolean, nesoRequestFailed: boolean): string {
  if (isOffline) return OFFLINE_COPY.heroOffline;
  return nesoRequestFailed ? OUTAGE_COPY.heroTitle : OUTAGE_COPY.heroUnavailable;
}

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
  niNote: NI_ALL_ISLAND_GRID,
} as const;

/** State 4: unknown postcode (inline field error). Always Plain. */
export const POSTCODE_COPY = {
  notFound: (outward: string) => `We couldn't find ${outward}. Check it, or use the GB average.`,
  tryAgain: 'Try again',
  useAverage: 'Use GB average',
} as const;

/**
 * PR-2b (Design brief §3 and Q5): carbon shows as haze and gas-plant smoke, driven
 * by the NESO band only (the `index` string the hero shows), never by a gram
 * cut-off or the cleanliness formula.
 *
 * - Very low and low: no haze, no smoke.
 * - No reading (loading, failed, outage): no haze, no smoke.
 * - Only when there is a reading but no index string are grams used, with the
 *   same cut-offs as the HUD (`getCarbonIndex`), so the scene matches the number.
 */
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import { getCarbonIndex } from '@/lib/sceneUtils';

export type HazeBand = 'none' | 'moderate' | 'high' | 'very high';

const HAZE_BANDS: ReadonlySet<string> = new Set(['moderate', 'high', 'very high']);
const KNOWN_INDEX: ReadonlySet<string> = new Set([
  'very low',
  'low',
  'moderate',
  'high',
  'very high',
]);

/** NESO index → haze band. `index` undefined or empty with no intensity means no data. */
export function getHazeBand(index: string | undefined | null, intensity?: number | null): HazeBand {
  let k = (index || '').trim().toLowerCase();
  if (!KNOWN_INDEX.has(k)) {
    if (typeof intensity !== 'number' || !Number.isFinite(intensity)) return 'none';
    k = getCarbonIndex(intensity);
  }
  return HAZE_BANDS.has(k) ? (k as HazeBand) : 'none';
}

/** Dawn, dusk and night use the low light-pollution glow instead of the day wash. */
export function isHazeDim(timeOfDay: TimeOfDay | string): boolean {
  return timeOfDay === 'dawn' || timeOfDay === 'dusk' || timeOfDay === 'night';
}

export type ActiveHazeBand = Exclude<HazeBand, 'none'>;

/** LIFE-LIST A2 ceiling: no haze opacity anywhere above this. */
export const HAZE_MAX_OPACITY = 0.45;

/**
 * Day (morning to sunset). Design, 29 Oct 2026 (#196 review): one warm grey-brown
 * (#b9b2a0) wash over the lower 45% of the sky, peaking at the horizon and fading
 * upward, at about 15% / 30% / 45% by band. The hill layers follow the same ramp.
 */
export const HAZE_TINT = '#b9b2a0';
export const HAZE_DAY: Record<
  ActiveHazeBand,
  { tint: string; far: number; back: number; village: number; front: number; sky: number }
> = {
  moderate: { tint: HAZE_TINT, far: 0.15, back: 0.1, village: 0.05, front: 0, sky: 0.15 },
  high: { tint: HAZE_TINT, far: 0.3, back: 0.2, village: 0.1, front: 0.03, sky: 0.3 },
  'very high': { tint: HAZE_TINT, far: 0.45, back: 0.3, village: 0.15, front: 0.05, sky: 0.45 },
};

/**
 * Day only (Design, 29 Oct 2026, round 4): the whole sky gradient is blended top to
 * bottom toward #6f777e so the sky reads grey-blue rather than clean cyan. The
 * blend and the sky sit outside the scene filter, so the set colour lands. Drawn
 * under all scene art, so the land never changes. Very low, low and moderate: none.
 * Tuned on the measured top sky pixel, which also sits under the hero's white/30
 * scrim: very high lands at about (138,172,189) against Design's (130,165,180).
 */
export const HAZE_SKY_BLEND_COLOR = '#6f777e';
export const HAZE_SKY_BLEND: Record<HazeBand, number> = {
  none: 0,
  moderate: 0,
  high: 0.15,
  'very high': 0.7,
};
/**
 * Sky blend for a band and time of day. Blue-sky daytime only (morning, midday,
 * afternoon): sunset's warm sky is not cyan and the blend there drops the dark hero
 * text to 4.44:1. 0 after dark (the night murk is approved as is).
 */
const SKY_BLEND_TIMES: ReadonlySet<string> = new Set(['morning', 'midday', 'afternoon']);
export function getSkyBlend(band: HazeBand, timeOfDay: TimeOfDay | string): number {
  return SKY_BLEND_TIMES.has(timeOfDay) ? HAZE_SKY_BLEND[band] : 0;
}

/**
 * Dawn, dusk, night: a lighter murk on the horizon (lighter than the night sky,
 * so the haze still reads after dark), in the lowest 30% of the sky.
 */
export const HAZE_DIM_TINT = '#9c9486';
export const HAZE_DIM_SKY_PEAK: Record<ActiveHazeBand, number> = {
  moderate: 0.15,
  high: 0.25,
  'very high': 0.35,
};
/** Hills get 60% of the day values after dark. */
export const HAZE_DIM_HILL_FACTOR = 0.6;

/** Fraction of the sky height (up from the horizon) where the sky wash reaches 0. */
export const HAZE_SKY_REACH = { day: 0.45, dim: 0.3 } as const;

/** When fog and haze are both true the fog grade wins: the sky wash is capped at 50%. */
export const HAZE_FOG_SKY_FACTOR = 0.5;

export interface HazeTokens {
  band: ActiveHazeBand;
  dim: boolean;
  tint: string;
  sky: number;
  skyReach: number;
  far: number;
  back: number;
  village: number;
  front: number;
}

/** Resolved haze for a band, time of day and fog flag; null when there is no haze. */
export function getHazeTokens(
  band: HazeBand,
  timeOfDay: TimeOfDay | string,
  isFoggy = false,
): HazeTokens | null {
  if (band === 'none') return null;
  const day = HAZE_DAY[band];
  const dim = isHazeDim(timeOfDay);
  const hill = dim ? HAZE_DIM_HILL_FACTOR : 1;
  const sky = (dim ? HAZE_DIM_SKY_PEAK[band] : day.sky) * (isFoggy ? HAZE_FOG_SKY_FACTOR : 1);
  const cap = (v: number) => Math.min(HAZE_MAX_OPACITY, Math.round(v * 1000) / 1000);
  return {
    band,
    dim,
    tint: dim ? HAZE_DIM_TINT : day.tint,
    sky: cap(sky),
    skyReach: dim ? HAZE_SKY_REACH.dim : HAZE_SKY_REACH.day,
    far: cap(day.far * hill),
    back: cap(day.back * hill),
    village: cap(day.village * hill),
    front: cap(day.front * hill),
  };
}

/** Sun halo opacity multiplier (day): × 0.80 at moderate; no glow at high and very high. */
export const SUN_HALO_FACTOR: Record<HazeBand, number> = {
  none: 1,
  moderate: 0.8,
  high: 0,
  'very high': 0,
};
/** Design, 29 Oct 2026 (round 3): at high and very high the sun has no glow and the disc dims. */
export const SUN_DISC_OPACITY: Record<HazeBand, number> = {
  none: 1,
  moderate: 1,
  high: 0.7,
  'very high': 0.7,
};

/** The sun disc warms under heavy haze; never brown, never darker than the day disc. */
export const SUN_DISC_HAZE: Partial<Record<HazeBand, string>> = {
  high: '#ffe1a8',
  'very high': '#ffd08a',
};

/** Stars thinned by 30% / 60% / all hidden at moderate / high / very high. */
export const STAR_HAZE_FACTOR: Record<HazeBand, number> = {
  none: 1,
  moderate: 0.7,
  high: 0.4,
  'very high': 0,
};

/** Gas-plant smoke per band (Q5 smoke table). Never black. */
export const SMOKE_BY_BAND: Record<
  ActiveHazeBand,
  { puffs: number; day: string; opacity: number }
> = {
  moderate: { puffs: 3, day: '#e8e4dc', opacity: 0.35 },
  // Round 3: darker smoke so it reads against the hazy sky.
  high: { puffs: 5, day: '#9a968e', opacity: 0.5 },
  'very high': { puffs: 6, day: '#7d7a74', opacity: 0.6 },
};
/**
 * Plume height in SVG units (Design, 29 Oct 2026): a clearly visible column at
 * high and very high, at least 60 px tall at 390 wide (1 unit is about 1 px
 * there). Moderate keeps the short wisp.
 */
export const SMOKE_PLUME_UNITS: Record<ActiveHazeBand, number> = {
  moderate: 18,
  high: 64,
  'very high': 72,
};
/** High and very high draw a static tapered column under the puffs. */
export function showsSmokeColumn(band: HazeBand): boolean {
  return band === 'high' || band === 'very high';
}
export const SMOKE_NIGHT_FILL = '#8f8794';
export const SMOKE_NIGHT_UNDERLIGHT = '#f2b36b';
export const SMOKE_NIGHT_UNDERLIGHT_OPACITY = 0.35;
/** Puff motion (LIFE-LIST A1): 6 px start, grows to 1.8×, rises 18 px, fades over 6 s. */
export const SMOKE_PUFF = { startPx: 6, endScale: 1.8, risePx: 18, seconds: 6 } as const;
/** Reduce Motion: 3 static puffs per stack at the band opacity. */
export const SMOKE_STATIC_PUFFS = 3;

/** Smoke shows only at moderate and above. */
export function showsSmoke(band: HazeBand): band is ActiveHazeBand {
  return band !== 'none';
}

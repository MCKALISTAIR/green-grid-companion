import { nesoBand } from '@/lib/nesoBand';
import { TimeOfDay } from '@/hooks/useTimeOfDay';
import { WeatherData } from '@/hooks/useWeatherData';

// Time-based sky gradient colors
export const TIME_SKY_COLORS: Record<TimeOfDay, { start: string; mid: string; end: string }> = {
  night: { start: 'hsl(230 70% 25%)', mid: 'hsl(240 60% 35%)', end: 'hsl(250 50% 40%)' }, // Richer blues for clean nights
  dawn: { start: 'hsl(280 40% 35%)', mid: 'hsl(30 60% 55%)', end: 'hsl(45 50% 70%)' },
  morning: { start: 'hsl(200 80% 60%)', mid: 'hsl(195 70% 70%)', end: 'hsl(180 50% 75%)' },
  midday: { start: 'hsl(200 90% 55%)', mid: 'hsl(195 80% 65%)', end: 'hsl(150 60% 75%)' },
  afternoon: { start: 'hsl(200 70% 60%)', mid: 'hsl(190 60% 68%)', end: 'hsl(160 50% 72%)' },
  sunset: { start: 'hsl(30 70% 50%)', mid: 'hsl(20 80% 60%)', end: 'hsl(280 40% 45%)' },
  dusk: { start: 'hsl(260 50% 35%)', mid: 'hsl(270 45% 40%)', end: 'hsl(240 40% 30%)' },
};

export function getSkyGradient(
  index: string,
  timeOfDay: TimeOfDay,
  cleanliness: number,
  weather?: WeatherData,
): string {
  const params = getSkyParams(index, timeOfDay, cleanliness, weather);
  return params.gradient;
}

export function getSkyTopColor(
  index: string,
  timeOfDay: TimeOfDay,
  cleanliness: number,
  weather?: WeatherData,
): string {
  const params = getSkyParams(index, timeOfDay, cleanliness, weather);
  return params.startColor;
}

function getSkyParams(
  index: string,
  timeOfDay: TimeOfDay,
  cleanliness: number,
  weather?: WeatherData,
): { gradient: string; startColor: string } {
  const timeColors = TIME_SKY_COLORS[timeOfDay] || TIME_SKY_COLORS['night'];

  if (!timeColors) {
    // Should structurally never happen if 'night' key exists, but safe fallback
    return {
      startColor: 'hsl(230 70% 25%)',
      gradient:
        'linear-gradient(180deg, hsl(230 70% 25%) 0%, hsl(240 60% 35%) 40%, hsl(250 50% 40%) 100%)',
    };
  }
  // Weather modifies sky colors
  if (weather) {
    // Overcast/cloudy weather makes sky grayer
    if (weather.cloudCover > 70 || weather.isRaining) {
      const grayFactor = Math.min(weather.cloudCover / 100, 0.8);
      const startColor = `hsl(220 ${20 - grayFactor * 15}% ${45 + grayFactor * 10}%)`;
      return {
        startColor,
        gradient: `linear-gradient(180deg, 
        ${startColor} 0%, 
        hsl(220 ${15 - grayFactor * 10}% ${55 + grayFactor * 5}%) 40%, 
        hsl(220 ${10 - grayFactor * 5}% ${60}%) 100%)`,
      };
    }

    // Foggy weather
    if (weather.isFoggy) {
      const startColor = `hsl(0 0% 75%)`;
      return {
        startColor,
        gradient: `linear-gradient(180deg, 
        ${startColor} 0%, 
        hsl(0 0% 80%) 40%, 
        hsl(0 0% 85%) 100%)`,
      };
    }

    // Thunderstorm - dark dramatic sky
    if (weather.isThunderstorm) {
      const startColor = `hsl(240 30% 25%)`;
      return {
        startColor,
        gradient: `linear-gradient(180deg, 
        ${startColor} 0%, 
        hsl(250 25% 35%) 40%, 
        hsl(260 20% 40%) 100%)`,
      };
    }

    // Snowy weather - lighter, whiter sky
    if (weather.isSnowing) {
      const startColor = `hsl(210 20% 70%)`;
      return {
        startColor,
        gradient: `linear-gradient(180deg, 
        ${startColor} 0%, 
        hsl(210 15% 80%) 40%, 
        hsl(210 10% 85%) 100%)`,
      };
    }
  }

  // Default time-based gradient
  return {
    startColor: timeColors.start,
    gradient: `linear-gradient(180deg, ${timeColors.start} 0%, ${timeColors.mid} 40%, ${timeColors.end} 100%)`,
  };
}

/** BH-139: NESO 2026 bands, the same as the hero label. */
export function getCarbonIndex(intensity: number): string {
  return nesoBand(intensity);
}

// ── Hill path sampling ──────────────────────────────────────────────
// Evaluates the ridge-line Y for a given X on each hill layer.
// SVG viewBox is 0-400 x, 0-150 y.  The paths are defined in Landscape.tsx.
// Any time those paths change, update the segment definitions here too.

/** Evaluate a quadratic Bézier at parameter t */
function quadBezier(t: number, p0: number, p1: number, p2: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/** Find t for a given X on a quadratic Bézier (monotonic in x) via binary search */
function solveT(targetX: number, sx: number, cx: number, ex: number): number {
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (quadBezier(mid, sx, cx, ex) < targetX) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

interface BezierSegment {
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  ex: number;
  ey: number;
}

function sampleSegments(segments: BezierSegment[], x: number): number {
  for (const seg of segments) {
    if (x >= seg.sx && x <= seg.ex) {
      const t = solveT(x, seg.sx, seg.cx, seg.ex);
      return quadBezier(t, seg.sy, seg.cy, seg.ey);
    }
  }
  // Fallback: clamp to last segment end
  return segments[segments.length - 1].ey;
}

// Hill path definitions (must match Landscape.tsx paths)
// Back: "M0,150 L0,100 Q100,50 200,100 Q300,140 400,80"
const BACK_HILL_SEGMENTS: BezierSegment[] = [
  { sx: 0, sy: 100, cx: 100, cy: 50, ex: 200, ey: 100 },
  { sx: 200, sy: 100, cx: 300, cy: 140, ex: 400, ey: 80 },
];

// Mid: "M0,150 L0,120 Q80,140 160,100 Q240,60 320,110 Q360,130 400,100"
const MID_HILL_SEGMENTS: BezierSegment[] = [
  { sx: 0, sy: 120, cx: 80, cy: 140, ex: 160, ey: 100 },
  { sx: 160, sy: 100, cx: 240, cy: 60, ex: 320, ey: 110 },
  { sx: 320, sy: 110, cx: 360, cy: 130, ex: 400, ey: 100 },
];

// Front: "M0,150 L0,135 Q120,100 200,135 Q280,180 400,120"
const FRONT_HILL_SEGMENTS: BezierSegment[] = [
  { sx: 0, sy: 135, cx: 120, cy: 100, ex: 200, ey: 135 },
  { sx: 200, sy: 135, cx: 280, cy: 180, ex: 400, ey: 120 },
];

export type HillLayer = 'back' | 'mid' | 'front';

/**
 * Get the Y coordinate of a hill ridge at a given X position (SVG coords 0-400).
 * Returns the SVG Y value on the ridge line.
 */
export function getHillRidgeY(layer: HillLayer, svgX: number): number {
  const clampedX = Math.max(0, Math.min(400, svgX));
  switch (layer) {
    case 'back':
      return sampleSegments(BACK_HILL_SEGMENTS, clampedX);
    case 'mid':
      return sampleSegments(MID_HILL_SEGMENTS, clampedX);
    case 'front':
      return sampleSegments(FRONT_HILL_SEGMENTS, clampedX);
  }
}

/**
 * Convert an SVG Y value to a CSS bottom% within the landscape container.
 * @param svgY - Y value in SVG coords (0=top, 150=bottom)
 * @param containerPct - Height of landscape container as % of scene (default 65)
 */
export function hillYToBottomPct(svgY: number, containerPct = 65): number {
  return (1 - svgY / 150) * containerPct;
}

/**
 * Get the CSS bottom% for a turbine placed on a hill ridge.
 * @param layer - Which hill layer
 * @param leftPct - CSS left% (0-100) of the turbine in the scene
 * @param containerPct - Height of landscape container as % of scene (default 65)
 * @param nudge - Additional offset in bottom% (positive = higher, use small negative to sink base into ground)
 */
export function getTurbineBottomPct(
  layer: HillLayer,
  leftPct: number,
  containerPct = 65,
  nudge = -1,
): number {
  // Convert CSS left% (0-100) to SVG X (0-400)
  const svgX = (leftPct / 100) * 400;
  const svgY = getHillRidgeY(layer, svgX);
  return hillYToBottomPct(svgY, containerPct) + nudge;
}

/**
 * The zero-carbon celebration only fires on a real reading of 0 gCO₂/kWh.
 * useCarbonData reports 0 while loading or after an error, which used to
 * trigger a false "Net Zero!" badge.
 */
export function shouldCelebrateZeroCarbon(intensity: number, hasLiveReading: boolean): boolean {
  return hasLiveReading && Number.isFinite(intensity) && intensity <= 0;
}

/**
 * Readings older than this don't get the "Zero-carbon power right now" chip or
 * celebration. NESO publishes every 30 min, and the hero's freshness dot turns
 * red at 35 min; 45 min allows one missed update plus a small grace period.
 */
export const ZERO_CARBON_MAX_AGE_MINUTES = 45;

/** True when `lastUpdated` is a valid time no older than `maxAgeMinutes`. */
export function isReadingFresh(
  lastUpdated: string | Date | null | undefined,
  maxAgeMinutes = ZERO_CARBON_MAX_AGE_MINUTES,
  now: number = Date.now(),
): boolean {
  if (!lastUpdated) return false;
  const t = new Date(lastUpdated).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t <= maxAgeMinutes * 60000;
}

/** Ink used for hero text on light skies (art pass v1, §3 AA rule). */
export const HERO_INK = '#0f1a24';

export type HeroTextTone = 'ink' | 'light';

/**
 * Hero text colour by the sky actually drawn behind it (mirrors getSkyParams order):
 * light skies (morning, midday, afternoon, sunset, overcast/rain, fog) take ink;
 * dark skies (dawn, dusk, night, thunder) take white over the dark scrim.
 *
 * Design review of #185 (23 Oct 2026, incl. BH-107): at dusk and night the
 * hero is white in EVERY weather. Overcast, fog, rain, storm and snow skies are
 * dark then too, and ink measured about 2.4:1 on them (pixel-measured in
 * e2e/hero-contrast.spec.ts). The weather only decides the tone by day.
 */
export function getHeroTextTone(
  timeOfDay: TimeOfDay,
  weather?: Pick<WeatherData, 'cloudCover' | 'isRaining' | 'isFoggy' | 'isThunderstorm'>,
): HeroTextTone {
  if (timeOfDay === 'dusk' || timeOfDay === 'night') return 'light';
  if (weather) {
    if (weather.cloudCover > 70 || weather.isRaining) return 'ink';
    if (weather.isFoggy) return 'ink';
    if (weather.isThunderstorm) return 'light';
  }
  return timeOfDay === 'morning' ||
    timeOfDay === 'midday' ||
    timeOfDay === 'afternoon' ||
    timeOfDay === 'sunset'
    ? 'ink'
    : 'light';
}

/** Solid chip behind the hero location pill and trophy (see .hero-chip in index.css). */
export const HERO_CHIP = {
  fill: '#0f172a',
  fillHover: '#1e293b',
  border: '#e2e8f0',
  text: '#ffffff',
  icon: '#fcd34d',
} as const;

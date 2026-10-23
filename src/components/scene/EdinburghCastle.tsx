import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import {
  getEdinburghCastleColours,
  LANDMARK_SNOW_CAP,
  type CityWeatherState,
} from '@/lib/cityLandmarkPalette';

/**
 * Edinburgh Castle on Castle Rock, seen from the north (Princes Street): west
 * on the left, east on the right (Design brief §11.2, ref 09).
 *
 * Static flat silhouette in the far landmark layer, behind CityLandscapeBack.
 * viewBox 400x150 units, ground y 138.
 *
 * Proportions (brief §11.2, from published figures plus photo ratios):
 * - Silhouette 88u wide, x 110-198 (left of centre).
 * - Rock body width : cliff height = 3.75 : 1 (300 m plug, 80 m cliffs), so the
 *   cliff is 88 / 3.75 = 23.5u: rock top y 114.5.
 * - Castle band about a third of the cliff at its tallest roof: turret cap
 *   y 103.6, 8.4u above the curtain wall (y 112) over a 26u wall-to-base drop.
 * - Ref 09 review ratios (wall-line-to-rock-base / roofline-to-wall-line):
 *   west cluster 26 / 8.4 = 3.1 (photo ≈ 3.2); tall gabled block on the
 *   lower east wall 19.6 / 10 = 1.96 (photo ≈ 1.9). Both inside ±15%.
 * - West: near-vertical ragged cliff (4 facets). Top: a curtain wall stepping
 *   down east in 4 steps, a 3-block gabled/turreted cluster left of centre, a
 *   tall gabled block with chimney stubs in the right third, one flagpole.
 *   East: the rock eases into the tail.
 *
 * No animation, no filter, no blur. Weather, haze and the very-clean light are
 * pre-mixed fills from getEdinburghCastleColours.
 */
export const CASTLE_X0 = 110;
export const CASTLE_X1 = 198;
export const CASTLE_ROCK_TOP_Y = 114.5;
export const CASTLE_ROOFLINE_Y = 103.6;
export const CASTLE_WALL_LINE_Y = 112;
export const CASTLE_GROUND_Y = 138;

const ROCK = [
  [110, 138],
  [110.6, 131],
  [109.8, 126],
  [111.2, 121.5],
  [112.4, 117.2],
  [113.6, 114.6],
  [141, 114.8],
  [158, 116.4],
  [166, 118.8],
  [186, 121.2],
  [190, 124.5],
  [195, 131],
  [198, 136],
  [198.5, 138],
];

/** Darker facets on the west cliff and shade bands on the north face. */
const FACETS = [
  [
    [110.6, 131],
    [113.4, 130.2],
    [112.4, 124.6],
    [109.8, 126],
  ],
  [
    [111.2, 121.5],
    [114.2, 120.6],
    [113.9, 116.4],
    [112.4, 117.2],
  ],
  [
    [118, 124],
    [131, 121.8],
    [146, 124.6],
    [139, 129],
    [124, 130.4],
  ],
  [
    [160, 122.4],
    [174, 121.6],
    [182, 127],
    [168, 128.4],
  ],
];

/** Curtain wall following the rock top, stepping down to the east in 4 steps. */
const WALL = [
  [112.8, 115.2],
  [112.8, 112],
  [141, 112],
  [141, 113.6],
  [158, 113.6],
  [158, 116],
  [166, 116],
  [166, 118.4],
  [186, 118.4],
  [188.5, 121.6],
  [188.5, 123.6],
  [186, 121.6],
  [166, 119.2],
  [158, 116.8],
  [141, 115.2],
];

/** Wall-walk tops, for the snow caps and the rain sheen. */
const WALL_WALKS = [
  [112.8, 112, 28.2],
  [141, 113.6, 17],
  [158, 116, 8],
  [166, 118.4, 20],
];

/** Roofline the rim light follows (wall walk and the buildings on it). */
const RIM_PATH =
  'M112.8,112 H115 V109.6 H123 V112 H124 V105.6 L128.5,104.2 L133,105.6 V112 H134 V104.6 ' +
  'L135.65,103.6 L137.3,104.6 V107.4 H138 L143.5,106.2 L149,107.4 V110.8 H158 V113.2 H165 ' +
  'V116 H166 V118.4 H168 V109.8 L172.5,108.4 L177,109.8 V114.2 H184 V118.4 H186 L188.5,121.6';

const WEST_CLIFF_PATH = 'M113.6,114.6 L112.4,117.2 L111.2,121.5 L109.8,126 L110.6,131';

/** Five window slots; the first three light at dusk and night, all five for the hero. */
const WINDOWS = [
  [126, 107.6],
  [170.2, 112],
  [143, 109.4],
  [130.2, 107.6],
  [174, 112],
];

const pts = (p: number[][]) => p.map(([x, y]) => `${x},${y}`).join(' ');

export interface EdinburghCastleProps {
  timeOfDay: TimeOfDay;
  weather: CityWeatherState;
  /** NESO band string (the `index` the hero shows); drives far-layer haze. */
  nesoIndex?: string;
  /** Very-clean hero (NESO band very low): warm rim light, or lit windows after dark. */
  heroLit: boolean;
  synthwaveMode?: boolean;
}

export function EdinburghCastle({
  timeOfDay,
  weather,
  nesoIndex,
  heroLit,
  synthwaveMode = false,
}: EdinburghCastleProps) {
  const c = getEdinburghCastleColours({ timeOfDay, weather, nesoIndex, heroLit, synthwaveMode });

  return (
    <g
      data-city-art="edinburgh-castle"
      data-landmark-hero={heroLit ? 'lit' : 'off'}
      aria-hidden="true"
    >
      {/* Castle Rock */}
      <polygon points={pts(ROCK)} fill={c.rock} />
      {FACETS.map((f, i) => (
        <polygon key={i} points={pts(f)} fill={c.rockShade} opacity={0.55} />
      ))}

      {/* Curtain wall */}
      <polygon points={pts(WALL)} fill={c.walls} />

      {/* Cluster left of centre: low range, gabled block, turret, gabled range */}
      <rect x={115} y={109.6} width={8} height={2.6} fill={c.walls} />
      <rect x={115} y={109.6} width={8} height={0.6} fill={c.roofs} />
      <rect x={124} y={105.6} width={9} height={6.6} fill={c.walls} />
      <polygon points="124,105.6 128.5,104.2 133,105.6" fill={c.roofs} />
      <rect x={134} y={104.6} width={3.3} height={7.6} fill={c.walls} />
      <polygon points="133.7,104.6 135.65,103.6 137.6,104.6" fill={c.roofs} />
      <rect x={138} y={107.4} width={11} height={6.4} fill={c.walls} />
      <polygon points="138,107.4 143.5,106.2 149,107.4" fill={c.roofs} />
      {/* Flagpole */}
      <line x1={129} y1={104.2} x2={129} y2={100.4} stroke={c.roofs} strokeWidth={0.35} />

      {/* Low ranges on the stepping wall */}
      <rect x={149} y={110.8} width={9} height={3} fill={c.walls} />
      <rect x={149} y={110.8} width={9} height={0.6} fill={c.roofs} />
      <rect x={159} y={113.2} width={6} height={3} fill={c.walls} />
      <rect x={159} y={113.2} width={6} height={0.6} fill={c.roofs} />

      {/* Tall gabled block with chimney stubs (right third), on the low east wall */}
      <rect x={168} y={109.8} width={9} height={8.8} fill={c.walls} />
      <polygon points="168,109.8 172.5,108.4 177,109.8" fill={c.roofs} />
      <rect x={168.6} y={107.6} width={1} height={2.2} fill={c.roofs} />
      <rect x={175.4} y={107.6} width={1} height={2.2} fill={c.roofs} />
      <rect x={177} y={114.2} width={7} height={4.4} fill={c.walls} />
      <rect x={177} y={114.2} width={7} height={0.6} fill={c.roofs} />

      {/* Snow caps on the wall walks and the rock ledge */}
      {c.snowCap && (
        <g data-castle-snow="true">
          {WALL_WALKS.map(([x, y, w]) => (
            <rect key={x} x={x} y={y - 0.4} width={w} height={0.8} fill={LANDMARK_SNOW_CAP} />
          ))}
          <polygon points="113.6,114.6 141,114.8 141,115.6 113.9,115.4" fill={LANDMARK_SNOW_CAP} />
        </g>
      )}

      {/* Rain: wet sheen on the wall walks only */}
      {c.wetSheen && (
        <g data-castle-sheen="true">
          {WALL_WALKS.map(([x, y, w]) => (
            <rect key={x} x={x} y={y} width={w} height={0.5} fill="#ffffff" opacity={0.12} />
          ))}
        </g>
      )}

      {/* Lit windows (static) */}
      {WINDOWS.slice(0, c.litWindows).map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={0.9}
          height={1.2}
          fill={c.windowColor}
          data-castle-window="lit"
        />
      ))}

      {/* Rim light: very-clean hero, or the sunset sun side (west cliff too at sunset) */}
      {c.rim && (
        <g data-castle-rim="true">
          <path
            d={RIM_PATH}
            fill="none"
            stroke={c.rim.color}
            strokeOpacity={c.rim.opacity}
            strokeWidth={0.6}
            strokeLinejoin="round"
          />
          {timeOfDay === 'sunset' && (
            <path
              d={WEST_CLIFF_PATH}
              fill="none"
              stroke={c.rim.color}
              strokeOpacity={c.rim.opacity * 0.6}
              strokeWidth={0.5}
            />
          )}
        </g>
      )}
    </g>
  );
}

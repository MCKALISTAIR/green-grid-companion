/**
 * PR-2b (Design brief Q5): carbon haze as one horizon-weighted wash.
 *
 * Replaces IntensityMood (its backdrop-filter saturate() is gone), the cleanliness
 * driven SceneAtmosphericDepth band, and the city and coastal SmogBand. The wash
 * is drawn in the same SVG space as the landscape layers (same viewBox, same
 * `xMidYMax meet`), so its stops line up with the far ridge, back hill, village
 * and front layer at every viewport. Opacity only, pre-tinted fill, no filter,
 * no blur, no animation. It renders nothing at very low and low, and nothing
 * without a reading.
 */
import { useEffect, useRef, useState } from 'react';
import type { SceneType } from '@/hooks/useSceneType';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import { getHazeTokens, HAZE_TOP_DESAT, type HazeBand } from '@/lib/sceneHaze';

/** Per-scene depth stops in that scene's SVG user units (y grows downward). */
const HAZE_GEOMETRY: Record<
  SceneType,
  {
    viewBox: [number, number, number, number];
    horizon: number;
    far: number;
    back: number;
    village: number;
    front: number;
  }
> = {
  // Landscape.tsx hills: back ridge ~75-100, mid ~80-130, front ~100-150.
  countryside: {
    viewBox: [0, 30, 400, 120],
    horizon: 72,
    far: 80,
    back: 95,
    village: 115,
    front: 135,
  },
  // City skyline: back row tops ~60-95, ground line 138.
  city: { viewBox: [0, 0, 400, 150], horizon: 62, far: 72, back: 92, village: 115, front: 136 },
  // Coastal: sea horizon ~68, cliffs and beach below.
  coastal: { viewBox: [0, 0, 400, 150], horizon: 68, far: 76, back: 92, village: 112, front: 132 },
};

/** Sky height in SVG units when the box hasn't been measured yet (390x844 hero). */
const FALLBACK_SKY_UNITS = 180;

function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

export interface SceneHazeProps {
  band: HazeBand;
  sceneType: SceneType;
  timeOfDay: TimeOfDay;
  isFoggy?: boolean;
  /** Synthwave is its own palette: no haze over it. */
  synthwaveMode?: boolean;
}

export function SceneHaze({ band, sceneType, timeOfDay, isFoggy, synthwaveMode }: SceneHazeProps) {
  const [ref, box] = useBox<HTMLDivElement>();
  const tokens = synthwaveMode ? null : getHazeTokens(band, timeOfDay, isFoggy);
  const g = HAZE_GEOMETRY[sceneType] ?? HAZE_GEOMETRY.countryside;
  const [vx, vy, vw, vh] = g.viewBox;
  const bottom = vy + vh;

  // Where the scene top sits in SVG units (meet: uniform scale, bottom-anchored).
  let skyUnits = FALLBACK_SKY_UNITS;
  if (box && box.w > 0 && box.h > 0) {
    const scale = Math.min(box.w / vw, box.h / vh);
    skyUnits = Math.max(1, g.horizon - (bottom - box.h / scale));
  }

  const stops = tokens
    ? [
        [g.horizon - tokens.skyReach * skyUnits, 0],
        [g.horizon, tokens.sky],
        [g.far, tokens.far],
        [g.back, tokens.back],
        [g.village, tokens.village],
        [g.front, tokens.front],
        [bottom, tokens.front],
      ]
    : [];
  const top = stops.length ? stops[0][0] : 0;
  const span = Math.max(1, bottom - top);
  const gid = `scene-haze-${sceneType}-${band.replace(' ', '-')}`;
  // Very high by day: a neutral veil desaturates the top of the sky a little.
  const desat = tokens && tokens.band === 'very high' && !tokens.dim;
  const skyTop = g.horizon - skyUnits;
  const desatEnd = skyTop + HAZE_TOP_DESAT.reach * skyUnits;
  const did = `${gid}-desat`;

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-[22] pointer-events-none"
      aria-hidden="true"
      data-art="haze"
      data-haze-band={tokens ? band : 'none'}
      data-haze-mode={tokens ? (tokens.dim ? 'glow' : 'day') : 'none'}
    >
      {tokens && (
        <svg
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMax meet"
          style={{ overflow: 'visible' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={gid}
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={top}
              y2={bottom}
            >
              {stops.map(([y, a], i) => (
                <stop
                  key={i}
                  offset={Math.max(0, Math.min(1, (y - top) / span)).toFixed(4)}
                  stopColor={tokens.tint}
                  stopOpacity={a}
                />
              ))}
            </linearGradient>
            {desat && (
              <linearGradient
                id={did}
                gradientUnits="userSpaceOnUse"
                x1="0"
                x2="0"
                y1={skyTop}
                y2={desatEnd}
              >
                <stop
                  offset="0"
                  stopColor={HAZE_TOP_DESAT.color}
                  stopOpacity={HAZE_TOP_DESAT.opacity}
                />
                <stop offset="1" stopColor={HAZE_TOP_DESAT.color} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          {desat && (
            <rect
              data-haze-desat=""
              x={vx - 2000}
              y={skyTop - 200}
              width={vw + 4000}
              height={desatEnd - skyTop + 200}
              fill={`url(#${did})`}
            />
          )}
          {/* Overflows the viewBox on purpose: covers the letterboxed sky and sides. */}
          <rect
            x={vx - 2000}
            y={top}
            width={vw + 4000}
            height={bottom - top + 200}
            fill={`url(#${gid})`}
          />
        </svg>
      )}
    </div>
  );
}

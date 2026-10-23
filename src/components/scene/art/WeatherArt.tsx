/**
 * Art pass v1 weather layer (ART-DIRECTION.md §4, ASSETS.md #2-#11), ported from
 * Design's src/art.js. Flat fills, one rim light, no strokes except the rim.
 * Every piece renders a finished still frame; motion is CSS and is switched off by
 * `prefers-reduced-motion` (see .art-* rules in index.css).
 */
import { useEffect, useId, useRef, useState } from 'react';
import {
  CLOUD_BANK_COLOURS,
  CLOUD_BANK_DAY_BELOW_TEXT,
  MOOD,
  SUN_COLOURS,
  type MoodBand,
  type SunTone,
  UNKNOWN_WEATHER_PALETTE,
  unknownWeatherTone,
} from '@/lib/artPalette';
import { bankRim, irregularBankEdge } from './bankEdge';

export function SceneSun({ r = 22, tone = 'day' }: { r?: number; tone?: SunTone }) {
  const id = useId().replace(/:/g, '');
  const [c0, c1] = SUN_COLOURS[tone];
  const s = r * 3;
  return (
    <svg
      width={s * 2}
      height={s * 2}
      viewBox={`${-s} ${-s} ${s * 2} ${s * 2}`}
      aria-hidden="true"
      data-art="sun"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0" stopColor={c0} stopOpacity=".55" />
          <stop offset="1" stopColor={c0} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c0} />
          <stop offset="1" stopColor={c1} />
        </linearGradient>
      </defs>
      <g className="art-breathe">
        <circle r={r * 3} fill={`url(#${id}h)`} />
        <circle r={r * 1.55} fill={c0} opacity=".18" />
      </g>
      <circle r={r} fill={`url(#${id}d)`} />
      <path
        d={`M${-r * 0.72} ${-r * 0.5} A${r} ${r} 0 0 1 ${r * 0.3} ${-r * 0.95}`}
        stroke="#fff"
        strokeOpacity=".7"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

const CLOUD_D =
  'M-46 0 H46 A12 12 0 0 0 40 -18 A16 16 0 0 0 18 -26 A22 22 0 0 0 -16 -30 A15 15 0 0 0 -36 -16 A10 10 0 0 0 -46 0Z';

/** Flat-based cloud, 92×30 at scale 1. */
export function SceneCloud({
  scale = 1,
  colours,
}: {
  scale?: number;
  colours: readonly [string, string] | readonly string[];
}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      width={96 * scale}
      height={34 * scale}
      viewBox="-48 -32 96 34"
      aria-hidden="true"
      data-art="cloud"
    >
      <defs>
        <clipPath id={id}>
          <path d={CLOUD_D} />
        </clipPath>
      </defs>
      <path d={CLOUD_D} fill={colours[0]} />
      <rect
        x="-50"
        y="-9"
        width="100"
        height="10"
        fill={colours[1]}
        opacity=".55"
        clipPath={`url(#${id})`}
      />
      <path
        d="M-34 -19 A15 15 0 0 1 -16 -29"
        stroke="#fff"
        strokeOpacity=".75"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M-6 -30 A22 22 0 0 1 16 -25"
        stroke="#fff"
        strokeOpacity=".6"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function bankPath(w: number, y: number) {
  let d = `M0 ${y}`;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x0 = (i * w) / n;
    const x1 = ((i + 1) * w) / n;
    d += ` Q${(x0 + x1) / 2} ${y - (i % 2 ? 22 : 34)} ${x1} ${y}`;
  }
  return `${d} V0 H0Z`;
}

/** The same scalloped edge, filled downwards: a bank whose tops are its edge. */
function risingBankPath(w: number, y: number, bottom: number) {
  return bankPath(w, y).replace(/ V0 H0Z$/, ` V${bottom} H0Z`);
}

/** CSS mask: the front lobes' scalloped edge over the top 120 px, solid below. */
const FRONT_LOBES_MASK = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="${risingBankPath(400, 46, 120)}"/></svg>`;
  const image = `url("data:image/svg+xml,${encodeURIComponent(svg)}"), linear-gradient(#000, #000)`;
  const size = '100% 120px, 100% calc(100% - 119px)';
  const position = 'top, bottom';
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: size,
    WebkitMaskSize: size,
    maskPosition: position,
    WebkitMaskPosition: position,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  } as const;
})();

/** Just the scalloped edge (for the lit rim on the top lobes). */
function bankEdgePath(w: number, y: number) {
  return bankPath(w, y).replace(/ V0 H0Z$/, '');
}

/**
 * Full-width overcast bank (overcast >70% or raining).
 *
 * Design review of #185 (23 Oct 2026): on the home hero (`topPx` given) the bank
 * follows the #179 rule, like the unknown-weather bank: its cloud tops start at
 * the hero text bottom + 34, so no cloud edge crosses the number, label or
 * warning icon (at 320x568 the hanging deck's edge sat right on the icon).
 * By day that bank is a mid-grey close to the sky above it, stepping darker
 * toward the horizon, with a lit rim on the top lobes only
 * (CLOUD_BANK_DAY_BELOW_TEXT); at dusk and night it keeps the night colours.
 * Without `topPx` (scene test page, compact scenes) it hangs from the top as before.
 */
export function CloudBank({ night = false, topPx }: { night?: boolean; topPx?: number }) {
  const [front, back] = night ? CLOUD_BANK_COLOURS.night : CLOUD_BANK_COLOURS.day;
  if (topPx != null) {
    const top = Math.round(topPx);
    const day = CLOUD_BANK_DAY_BELOW_TEXT;
    const c = night
      ? { back, front, base: front, rim: undefined }
      : { back: day.back, front: day.front, base: day.base, rim: day.rim };
    return (
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 overflow-hidden pointer-events-none"
        style={{ top: `${top}px` }}
        data-art="cloud-bank"
        data-variant="below-text"
        data-tone={night ? 'night' : 'day'}
        data-cloud-top={top}
      >
        <svg
          className="absolute inset-x-0 top-0 w-full h-[120px]"
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          aria-hidden="true"
          data-bank-body
        >
          <path d={risingBankPath(400, 20, 120)} fill={c.back} opacity={night ? 0.9 : 1} />
          {night && <path d={risingBankPath(400, 46, 120)} fill={c.front} opacity={0.95} />}
        </svg>
        {night ? (
          <div
            className="absolute inset-x-0 bottom-0 top-[119px]"
            style={{
              background: `linear-gradient(180deg, ${c.front} 0%, ${c.base} 100%)`,
              opacity: 0.95,
            }}
            data-bank-body
          />
        ) : (
          // By day the front lobes and the body are one surface (no seam where the
          // lobes end): a gradient anchored to the scene's bottom, the horizon,
          // where the intensity mood haze is strongest, so the bank still steps
          // darker there. Its top is cut to the front lobes' scalloped edge.
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${c.base} 0px, ${c.base} 110px, ${c.front} 270px)`,
              ...FRONT_LOBES_MASK,
            }}
            data-bank-body
            data-bank-front
          />
        )}
        {c.rim && (
          <svg
            className="absolute inset-x-0 top-0 w-full h-[120px]"
            viewBox="0 0 400 120"
            preserveAspectRatio="none"
            aria-hidden="true"
            data-bank-rim
          >
            <path
              d={bankEdgePath(400, 20)}
              fill="none"
              stroke={c.rim}
              strokeWidth="1.6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
    );
  }
  return (
    <svg
      className="absolute inset-x-0 top-0 w-full h-[40%]"
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-art="cloud-bank"
    >
      <path d={bankPath(400, 70)} fill={back} opacity=".9" />
      <path d={bankPath(400, 96)} fill={front} opacity=".95" />
    </svg>
  );
}

/** Three tapered filled streaks (wind ≥ 25 km/h). */
export function WindStreaks({ opacity = 0.7 }: { opacity?: number }) {
  const st = (dx: number, dy: number, L: number) =>
    `M${dx} ${dy} C${dx + L * 0.3} ${dy - 3} ${dx + L * 0.7} ${dy - 3} ${dx + L} ${dy + 0.2} C${dx + L * 0.7} ${dy + 1.4} ${dx + L * 0.3} ${dy + 1.4} ${dx} ${dy}Z`;
  return (
    <svg
      width="120"
      height="32"
      viewBox="0 -4 120 32"
      aria-hidden="true"
      data-art="wind"
      opacity={opacity}
    >
      <path d={st(0, 0, 90)} fill="#fff" />
      <path d={st(28, 12, 70)} fill="#fff" />
      <path d={st(10, 24, 54)} fill="#fff" />
    </svg>
  );
}

/** Short rounded capsules at 14°, max 40, count by precipitation intensity. */
export function RainCapsules({ intensity = 0.5 }: { intensity?: number }) {
  const n = Math.max(12, Math.min(40, Math.round(40 * intensity)));
  const drops = Array.from({ length: n }, (_, i) => ({
    x: ((i * 53) % 400) + 4,
    y: ((i * 97) % 180) + 10,
    d: (i % 7) * 0.13,
  }));
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 300"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-art="rain"
      opacity=".55"
    >
      {drops.map((p, i) => (
        <rect
          key={i}
          className="art-rain"
          style={{ animationDelay: `${p.d}s` }}
          x={p.x}
          y={p.y}
          width="2"
          height="9"
          rx="1"
          fill="#e6eef7"
          transform={`rotate(14 ${p.x} ${p.y})`}
        />
      ))}
    </svg>
  );
}

export function FogVeil() {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-art="fog"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity=".55" />
        </linearGradient>
      </defs>
      <rect x="0" y="35" width="100" height="65" fill={`url(#${id})`} />
    </svg>
  );
}

/** Two-ribbon aurora: night + zero/very clean + clear-ish sky. */
export function AuroraRibbon({ opacity = 0.38 }: { opacity?: number }) {
  const w = 400;
  const y = 70;
  return (
    <svg
      className="absolute inset-x-0 top-0 w-full h-[55%] art-undulate"
      viewBox="0 0 400 160"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-art="aurora"
      style={{ opacity }}
    >
      <path
        d={`M-10 ${y} C${w * 0.25} ${y - 40} ${w * 0.45} ${y + 20} ${w * 0.7} ${y - 30} S${w + 10} ${y - 10} ${w + 10} ${y - 24} V${y + 30} C${w * 0.6} ${y + 6} ${w * 0.3} ${y + 40} -10 ${y + 26}Z`}
        fill="#5eead4"
      />
      <path
        d={`M-10 ${y + 12} C${w * 0.3} ${y - 20} ${w * 0.5} ${y + 30} ${w + 10} ${y - 4} V${y + 18} C${w * 0.5} ${y + 40} ${w * 0.2} ${y + 18} -10 ${y + 30}Z`}
        fill="#a7f3d0"
        opacity=".7"
      />
    </svg>
  );
}

/**
 * Intensity mood (replaces the sepia/teal SceneColorGrade): a horizon haze plus a
 * saturation change, by band only. Zero adds a mint glow. No smoke, no yellow cast.
 */
export function IntensityMood({ band }: { band: MoodBand }) {
  const m = MOOD[band];
  return (
    <div
      className="absolute inset-0 z-[22] pointer-events-none art-fade"
      aria-hidden="true"
      data-art="mood"
      data-mood={band}
      style={{
        backdropFilter: m.sat === 1 ? undefined : `saturate(${m.sat})`,
        WebkitBackdropFilter: m.sat === 1 ? undefined : `saturate(${m.sat})`,
        background:
          m.a > 0
            ? `linear-gradient(to bottom, transparent 30%, ${hexA(m.haze, m.a)} 78%, ${hexA(m.haze, m.a * 1.1)} 100%)`
            : 'transparent',
      }}
    />
  );
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.min(1, a).toFixed(3)})`;
}

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(1, Math.round(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * BH-90: the cloud bank for unknown weather (ART-DIRECTION.md §4 overcast, village
 * REDRAW-PLAN cloud banks): a paler back bank at lower opacity and a front bank
 * offset below it so the scallops overlap, a lit top edge, a darker base. The top
 * sits at `topPx` (hero text bottom + 34) so no cloud edge crosses the text.
 */
export function UnknownWeatherCloudBank({
  topPx,
  timeOfDay = 'midday',
}: {
  topPx?: number;
  timeOfDay?: string;
}) {
  const id = useId().replace(/:/g, '');
  const [ref, width] = useWidth<HTMLDivElement>(400);
  const { bank, rim } = UNKNOWN_WEATHER_PALETTE[unknownWeatherTone(timeOfDay)];
  const [back, front, base] = bank;
  const backEdge = irregularBankEdge(width, 17, 11);
  const frontEdge = irregularBankEdge(width, 41, 37);
  const FRONT_DROP = 14;
  const fill = (edge: string) => `${edge} V4000 H-40 Z`;
  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-x-0 bottom-0 overflow-hidden pointer-events-none"
      style={{ top: topPx != null ? `${Math.round(topPx)}px` : '40%' }}
      data-art="cloud-bank"
      data-variant="unknown-weather"
      data-cloud-top={topPx != null ? Math.round(topPx) : undefined}
    >
      <svg className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`ub${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={front} />
            <stop offset=".5" stopColor={front} />
            <stop offset="1" stopColor={base} />
          </linearGradient>
        </defs>
        <path d={fill(backEdge)} fill={back} opacity=".7" />
        <path
          d={bankRim(width, 17, 11)}
          fill="none"
          stroke={rim}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity=".7"
        />
        <g transform={`translate(0 ${FRONT_DROP})`}>
          <path d={fill(frontEdge)} fill={`url(#ub${id})`} opacity=".92" />
          <path
            d={bankRim(width, 41, 37)}
            fill="none"
            stroke={rim}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

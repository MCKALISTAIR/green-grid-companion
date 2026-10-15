/**
 * Art pass v1 weather layer (ART-DIRECTION.md §4, ASSETS.md #2-#11), ported from
 * Design's src/art.js. Flat fills, one rim light, no strokes except the rim.
 * Every piece renders a finished still frame; motion is CSS and is switched off by
 * `prefers-reduced-motion` (see .art-* rules in index.css).
 */
import { useId } from 'react';
import {
  CLOUD_BANK_COLOURS,
  MOOD,
  SUN_COLOURS,
  type MoodBand,
  type SunTone,
} from '@/lib/artPalette';

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

/** Full-width overcast bank (overcast >70% or raining). */
export function CloudBank({ night = false }: { night?: boolean }) {
  const [front, back] = night ? CLOUD_BANK_COLOURS.night : CLOUD_BANK_COLOURS.day;
  return (
    <svg
      className="absolute inset-x-0 top-0 w-full h-[40%] art-drift-slow"
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

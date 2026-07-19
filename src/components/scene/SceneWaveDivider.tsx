import { useReducedMotion } from 'framer-motion';

interface SceneWaveDividerProps {
  /** 0 = dirty (flat, murky), 1 = clean (tall playful waves) */
  cleanliness: number;
  /** CSS color of the fill — should match the content area below the scene */
  fillColor?: string;
}

/** Builds a smooth SVG wave path across the full width.
 *  amplitude: height of crests in SVG units (viewBox 0 0 1440 80)
 *  humps: number of full wave cycles across the width
 */
function buildWavePath(amplitude: number, humps: number): string {
  const W = 1440;
  const H = 80;
  const baseline = H;
  const cycleW = W / humps;

  let d = `M0 ${baseline}`;

  for (let h = 0; h < humps; h++) {
    const x0 = h * cycleW;
    const cp1x = x0 + cycleW * 0.25;
    const cp1y = baseline - amplitude;
    const midx = x0 + cycleW * 0.5;
    const midy = baseline - amplitude * 0.05;
    const cp2x = x0 + cycleW * 0.75;
    const cp2y = baseline - amplitude;
    const ex = x0 + cycleW;
    const ey = baseline;

    d += ` C${cp1x} ${cp1y} ${midx} ${midy} ${midx} ${midy}`;
    d += ` C${midx} ${midy} ${cp2x} ${cp2y} ${ex} ${ey}`;
  }

  d += ` L${W} ${H + 10} L0 ${H + 10} Z`;
  return d;
}

export function SceneWaveDivider({ cleanliness, fillColor }: SceneWaveDividerProps) {
  const prefersReducedMotion = useReducedMotion();

  // Amplitude: 6px (dirty/flat) → 22px (clean/playful)
  const amplitude = 6 + cleanliness * 16;
  // Humps: 2 (dirty) → 4 (clean)
  const humps = Math.round(2 + cleanliness * 2);

  const path = buildWavePath(amplitude, humps);
  const fill = fillColor ?? 'hsl(var(--background))';

  return (
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-none z-40"
      style={{ height: '80px' }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <path
          d={path}
          fill={fill}
          style={{ transition: prefersReducedMotion ? undefined : 'd 2.5s ease-in-out' }}
        />
      </svg>
    </div>
  );
}

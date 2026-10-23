/**
 * PR-2b (Design brief Q5): the gas plant (a CCGT) that replaces the white-box
 * SimpleFactory icons. One plant, on the back hill, inside the 320 crop.
 *
 * - Always present as a building. Smokeless at very low and low, and when there
 *   is no reading. (REDRAW-PLAN open question 2 stays with Alistair; if he says
 *   no, gate the mount on the haze band.)
 * - Smoke comes only from its two stacks at moderate and above, density by the
 *   NESO band, not gas share. One animated group, CSS transform and opacity
 *   only. Reduce Motion: 3 static puffs per stack.
 * - Drawn in the countryside SVG space (viewBox 0 30 400 120).
 */
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getHillRidgeY } from '@/lib/sceneUtils';
import {
  SMOKE_BY_BAND,
  SMOKE_NIGHT_FILL,
  SMOKE_NIGHT_UNDERLIGHT,
  SMOKE_NIGHT_UNDERLIGHT_OPACITY,
  SMOKE_PUFF,
  SMOKE_STATIC_PUFFS,
  showsSmoke,
  type HazeBand,
} from '@/lib/sceneHaze';
import { WIND_STATE_KMH } from '@/lib/sceneConfig';

/** Q7 prop tokens (day), plus Design-default dark tokens for dusk and night. */
export const GAS_PLANT_TOKENS = {
  day: { light: '#d9dde2', shade: '#aab1ba', band: '#9aa1ab' },
  night: { light: '#5d6577', shade: '#454c5d', band: '#737b8c' },
} as const;
export const GAS_PLANT_AVIATION_RED = '#e5484d';

/** Left edge of the turbine hall, SVG units. Plant spans x 98-138. */
export const GAS_PLANT_X = 98;
const HALL = { w: 40, h: 12 };
const BOILER = { w: 14, h: 18 };
const STACK = { w: 3, h: 34 };

export function gasPlantGeometry(x = GAS_PLANT_X) {
  // Grounded on the back ridge: base at the lowest ridge point under the footprint
  // + 1 unit, so no edge floats (BRIEF §2).
  const xs = [x, x + HALL.w / 2, x + HALL.w];
  const baseY = Math.max(...xs.map((sx) => getHillRidgeY('back', sx))) + 1;
  const boilerX = x + HALL.w - BOILER.w;
  const stacks = [x + 19, x + 24.5].map((sx) => ({ x: sx, top: baseY - STACK.h }));
  return { x, baseY, boilerX, stacks, width: HALL.w };
}

export interface GasPlantProps {
  band: HazeBand;
  isNight: boolean;
  windSpeed?: number;
  x?: number;
}

export function GasPlant({ band, isNight, windSpeed = 0, x = GAS_PLANT_X }: GasPlantProps) {
  const reduced = useReducedMotion();
  const t = isNight ? GAS_PLANT_TOKENS.night : GAS_PLANT_TOKENS.day;
  const { baseY, boilerX, stacks } = gasPlantGeometry(x);
  const smoke = showsSmoke(band) ? SMOKE_BY_BAND[band] : null;
  // Wind direction isn't fetched yet, so plumes drift right (Decisions for Design);
  // a static 10° lean at wind >= 25 km/h.
  const lean = windSpeed >= WIND_STATE_KMH ? 10 : 0;
  const puffCount = smoke ? (reduced ? SMOKE_STATIC_PUFFS : smoke.puffs) : 0;
  const r = SMOKE_PUFF.startPx / 2;

  return (
    <g data-art="gas-plant" data-smoke={smoke ? band : 'none'} aria-hidden="true">
      {/* Stacks, behind the hall: slim, two thin bands each. */}
      {stacks.map((s, i) => (
        <g key={`stack-${i}`}>
          <rect x={s.x} y={s.top} width={STACK.w} height={STACK.h} fill={t.light} />
          <rect
            x={s.x + STACK.w * 0.6}
            y={s.top}
            width={STACK.w * 0.4}
            height={STACK.h}
            fill={t.shade}
          />
          <rect x={s.x} y={s.top + 3} width={STACK.w} height={1} fill={t.band} />
          <rect x={s.x} y={s.top + 7} width={STACK.w} height={1} fill={t.band} />
          {isNight && (
            <circle
              cx={s.x + STACK.w / 2}
              cy={s.top - 0.6}
              r={0.9}
              fill={GAS_PLANT_AVIATION_RED}
              data-gas-plant-light=""
            />
          )}
        </g>
      ))}
      {/* Boiler block at the east end. */}
      <rect x={boilerX} y={baseY - BOILER.h} width={BOILER.w} height={BOILER.h} fill={t.light} />
      <rect
        x={boilerX + BOILER.w * 0.62}
        y={baseY - BOILER.h}
        width={BOILER.w * 0.38}
        height={BOILER.h}
        fill={t.shade}
      />
      {/* Long low turbine hall with a shallow roof line. */}
      <path
        d={`M${x} ${baseY} V${baseY - HALL.h + 1.5} L${x + (HALL.w - BOILER.w) / 2} ${baseY - HALL.h} L${boilerX} ${baseY - HALL.h + 1.5} V${baseY} Z`}
        fill={t.light}
      />
      <rect x={x} y={baseY - 4} width={boilerX - x} height={4} fill={t.shade} />

      {smoke &&
        stacks.map((s, si) => {
          const cx = s.x + STACK.w / 2;
          const cy = s.top - r - 0.5;
          return (
            <g
              key={`plume-${si}`}
              data-art="smoke"
              opacity={smoke.opacity}
              transform={lean ? `rotate(${lean} ${cx} ${s.top})` : undefined}
            >
              {Array.from({ length: puffCount }).map((_, i) => {
                const f = (i + 0.5) / puffCount;
                // Static pose (Reduce Motion, or animations paused): spread up the plume.
                const pose = `translate(${(6 * f).toFixed(2)}px, ${(-SMOKE_PUFF.risePx * f).toFixed(2)}px) scale(${(1 + (SMOKE_PUFF.endScale - 1) * f).toFixed(3)})`;
                const delay = -((i / puffCount) * SMOKE_PUFF.seconds + si * 0.9);
                return (
                  <g
                    key={i}
                    className={reduced ? undefined : 'art-smoke-puff'}
                    data-smoke-puff=""
                    style={{
                      transform: pose,
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                      opacity: reduced ? 1 - 0.35 * f : 1 - 0.6 * f,
                      animationDelay: reduced ? undefined : `${delay.toFixed(2)}s`,
                    }}
                  >
                    {isNight && (
                      <circle
                        cx={cx}
                        cy={cy + 0.8}
                        r={r}
                        fill={SMOKE_NIGHT_UNDERLIGHT}
                        opacity={SMOKE_NIGHT_UNDERLIGHT_OPACITY}
                      />
                    )}
                    <circle cx={cx} cy={cy} r={r} fill={isNight ? SMOKE_NIGHT_FILL : smoke.day} />
                  </g>
                );
              })}
            </g>
          );
        })}
    </g>
  );
}

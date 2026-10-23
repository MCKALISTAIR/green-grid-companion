/**
 * PR-2b (Design brief Q5): the gas plant (a CCGT) that replaces the white-box
 * SimpleFactory icons. One plant, on the back hill, inside the 320 crop.
 *
 * - Always present as a building (Design decision 23 Oct 2026, BRIEF Q5; closes
 *   REDRAW-PLAN open question 2). Smokeless at very low and low, under "already
 *   zero carbon", and when there is no reading. Static aviation dots at night.
 * - Smoke comes only from its two stacks at moderate and above, density by the
 *   NESO band, not gas share. One animated group, CSS transform and opacity
 *   only. Reduce Motion: 3 static puffs per stack.
 * - Drawn in the countryside SVG space (viewBox 0 30 400 120).
 */
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  GAS_PLANT_HALL,
  GAS_PLANT_BOILER,
  GAS_PLANT_STACK,
  GAS_PLANT_TOKENS,
  GAS_PLANT_AVIATION_RED,
  GAS_PLANT_X,
  gasPlantGeometry,
} from '@/lib/gasPlant';
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
          <rect
            x={s.x}
            y={s.top}
            width={GAS_PLANT_STACK.w}
            height={GAS_PLANT_STACK.h}
            fill={t.light}
          />
          <rect
            x={s.x + GAS_PLANT_STACK.w * 0.6}
            y={s.top}
            width={GAS_PLANT_STACK.w * 0.4}
            height={GAS_PLANT_STACK.h}
            fill={t.shade}
          />
          <rect x={s.x} y={s.top + 3} width={GAS_PLANT_STACK.w} height={1} fill={t.band} />
          <rect x={s.x} y={s.top + 7} width={GAS_PLANT_STACK.w} height={1} fill={t.band} />
          {isNight && (
            <circle
              cx={s.x + GAS_PLANT_STACK.w / 2}
              cy={s.top - 0.6}
              r={0.9}
              fill={GAS_PLANT_AVIATION_RED}
              data-gas-plant-light=""
            />
          )}
        </g>
      ))}
      {/* Boiler block at the east end. */}
      <rect
        x={boilerX}
        y={baseY - GAS_PLANT_BOILER.h}
        width={GAS_PLANT_BOILER.w}
        height={GAS_PLANT_BOILER.h}
        fill={t.light}
      />
      <rect
        x={boilerX + GAS_PLANT_BOILER.w * 0.62}
        y={baseY - GAS_PLANT_BOILER.h}
        width={GAS_PLANT_BOILER.w * 0.38}
        height={GAS_PLANT_BOILER.h}
        fill={t.shade}
      />
      {/* Long low turbine hall with a shallow roof line. */}
      <path
        d={`M${x} ${baseY} V${baseY - GAS_PLANT_HALL.h + 1.5} L${x + (GAS_PLANT_HALL.w - GAS_PLANT_BOILER.w) / 2} ${baseY - GAS_PLANT_HALL.h} L${boilerX} ${baseY - GAS_PLANT_HALL.h + 1.5} V${baseY} Z`}
        fill={t.light}
      />
      <rect x={x} y={baseY - 4} width={boilerX - x} height={4} fill={t.shade} />

      {smoke &&
        stacks.map((s, si) => {
          const cx = s.x + GAS_PLANT_STACK.w / 2;
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

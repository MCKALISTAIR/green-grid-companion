/**
 * How long one turn of a scene turbine takes, in seconds (SVG `dur`).
 *
 * While the weather is unknown (offline, weather fetch failed, cold start)
 * the scene must not imply any wind, calm or strong. So every turbine —
 * countryside, coastal and offshore — turns at the one slow idle speed below:
 * no stopping, no difference between coast and inland, no per-layer or
 * per-turbine variation. Once real weather arrives, each kind goes back to
 * following the wind speed.
 */
export const IDLE_TURBINE_SECONDS = 20;

/** countryside = WindTurbine, offshore = OffshoreWind, coastal = CoastalOffshoreWind */
export type TurbineKind = 'countryside' | 'offshore' | 'coastal';

interface TurbineSpeedInput {
  kind: TurbineKind;
  windSpeed: number;
  weatherKnown: boolean;
  /** Position in its row; known weather only (staggers the speeds). */
  index?: number;
  /** Countryside depth layer; known weather only (back turbines turn slower). */
  layer?: 'back' | 'mid' | 'front';
}

export function turbineRotationSeconds({
  kind,
  windSpeed,
  weatherKnown,
  index = 0,
  layer = 'front',
}: TurbineSpeedInput): number {
  if (!weatherKnown) return IDLE_TURBINE_SECONDS;

  switch (kind) {
    case 'countryside': {
      // Near-zero wind → almost still
      const base = windSpeed < 2 ? 30 : Math.max(1.5, 6 - windSpeed / 8);
      // Background turbines slightly slower for parallax feel
      const layerSpeedMod = layer === 'back' ? 1.3 : layer === 'mid' ? 1.1 : 1;
      return base * layerSpeedMod + index * 0.2;
    }
    case 'offshore':
      return Math.max(6, 12 - windSpeed / 5);
    case 'coastal':
      return Math.max(4, 10 - windSpeed / 4) + index;
  }
}

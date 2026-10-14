/**
 * Pure footprint maths shared by every octopus-energy sync path.
 *
 * carbon_g = consumption_kwh × intensity_gco2_kwh, where intensity comes from
 * parseIntensityPoint (NESO actual → forecast). Half-hours with no usable
 * intensity are skipped — never written as 0 g or a 'moderate' band.
 */
import { parseIntensityPoint, type IntensityPoint } from './intensity-point.ts';

/** National (/intensity/...) and regional (/regional/intensity/.../regionid/N) bodies differ in shape. */
export function extractIntensityList(json: unknown, isRegional: boolean): unknown[] {
  // deno-lint-ignore no-explicit-any
  const data = (json as any)?.data;
  if (isRegional) {
    const list = Array.isArray(data) ? data[0]?.data : data?.data;
    return Array.isArray(list) ? list : [];
  }
  return Array.isArray(data) ? data : [];
}

export function buildIntensityMap(json: unknown, isRegional: boolean): { map: Map<string, IntensityPoint>; skipped: number } {
  const map = new Map<string, IntensityPoint>();
  let skipped = 0;
  for (const item of extractIntensityList(json, isRegional)) {
    const from = (item as { from?: unknown } | null)?.from;
    const point = typeof from === 'string' ? parseIntensityPoint(item) : null;
    if (point) map.set(from as string, point);
    else skipped++;
  }
  return { map, skipped };
}

export interface FootprintRow {
  interval_start: string;
  interval_end: string;
  consumption_kwh: number;
  intensity_gco2_kwh: number;
  carbon_g: number;
  intensity_index: string;
  mpan: string;
}

export function buildFootprintRows(
  consumption: Array<{ interval_start: string; interval_end: string; kwh: number }>,
  intensity: Map<string, IntensityPoint>,
  mpan: string,
): FootprintRow[] {
  const rows: FootprintRow[] = [];
  for (const r of consumption) {
    const point = intensity.get(r.interval_start);
    if (!point) continue;
    rows.push({
      interval_start: r.interval_start,
      interval_end: r.interval_end,
      consumption_kwh: r.kwh,
      intensity_gco2_kwh: point.intensity,
      carbon_g: r.kwh * point.intensity,
      intensity_index: point.index,
      mpan,
    });
  }
  return rows;
}

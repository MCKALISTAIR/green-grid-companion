/**
 * Pure footprint maths shared by every octopus-energy sync path.
 *
 * carbon_g = consumption_kwh × intensity_gco2_kwh, where intensity comes from
 * parseIntensityPoint (NESO actual → forecast). Half-hours with no usable
 * intensity are skipped — never written as 0 g or a 'moderate' band.
 */
import { parseIntensityPoint, type IntensityPoint } from './intensity-point.ts';
import { halfHourKey, halfHourKeyToIso } from './half-hour.ts';

/**
 * Intensity by epoch half-hour (see half-hour.ts). Keyed by instant, not by
 * string: NESO says "…T22:30Z", the DB says "…T22:30:00+00:00" and Octopus says
 * "…T23:30:00+01:00" for the same half-hour (BH-91).
 */
export type IntensityByHalfHour = Map<number, IntensityPoint>;

/** National (/intensity/...) and regional (/regional/intensity/.../regionid/N) bodies differ in shape. */
export function extractIntensityList(json: unknown, isRegional: boolean): unknown[] {
  const root = json as { data?: unknown } | null | undefined;
  const data = root?.data;
  if (isRegional) {
    const regional = data as { data?: unknown } | unknown[] | null | undefined;
    const list = Array.isArray(regional)
      ? (regional[0] as { data?: unknown } | undefined)?.data
      : regional && typeof regional === 'object'
        ? (regional as { data?: unknown }).data
        : undefined;
    return Array.isArray(list) ? list : [];
  }
  return Array.isArray(data) ? data : [];
}

export function buildIntensityMap(
  json: unknown,
  isRegional: boolean,
): { map: IntensityByHalfHour; skipped: number } {
  const map: IntensityByHalfHour = new Map();
  let skipped = 0;
  for (const item of extractIntensityList(json, isRegional)) {
    const from = (item as { from?: unknown } | null)?.from;
    const key = typeof from === 'string' ? halfHourKey(from) : null;
    const point = key === null ? null : parseIntensityPoint(item);
    if (key !== null && point) map.set(key, point);
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

/**
 * One row per reading whose half-hour has usable intensity. interval_start /
 * interval_end are written as canonical UTC ISO so the upsert key
 * (mpan, interval_start) is the same instant whichever source spelled it.
 */
export function buildFootprintRows(
  consumption: Array<{ interval_start: string; interval_end: string; kwh: number }>,
  intensity: IntensityByHalfHour,
  mpan: string,
): FootprintRow[] {
  const rows: FootprintRow[] = [];
  for (const r of consumption) {
    const key = halfHourKey(r.interval_start);
    if (key === null) continue;
    const point = intensity.get(key);
    if (!point) continue;
    const endKey = halfHourKey(r.interval_end);
    rows.push({
      interval_start: halfHourKeyToIso(key),
      interval_end: halfHourKeyToIso(endKey ?? key + 1),
      consumption_kwh: r.kwh,
      intensity_gco2_kwh: point.intensity,
      carbon_g: r.kwh * point.intensity,
      intensity_index: point.index,
      mpan,
    });
  }
  return rows;
}

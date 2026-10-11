/**
 * Client-side freshness gate for the grid-demand edge function.
 *
 * The edge function already refuses figures older than 20 minutes, but React
 * Query keeps the last good response around when a refetch fails, and an old
 * deployment of the function returns frozen numbers with a fresh-looking
 * timestamp. So the app only shows mix/GW figures when the response says
 * status "ok" and the time the figures describe is recent.
 */

/** 20 min server threshold + 5 min refetch interval + a little slack. */
export const GRID_DEMAND_MAX_AGE_MINUTES = 30;
/** Frequency readings are 15 s apart; anything older than this is not "live". */
export const GRID_FREQUENCY_MAX_AGE_MINUTES = 15;

export interface GridDemandPayloadLike {
  status?: unknown;
  timestamp?: unknown;
  gridFrequency?: unknown;
  frequencyTime?: unknown;
}

export class GridDataUnavailableError extends Error {
  constructor(public readonly reason: string) {
    super(`Grid data unavailable: ${reason}`);
    this.name = 'GridDataUnavailableError';
  }
}

const ageMinutes = (iso: string, now: number) => (now - Date.parse(iso)) / 60_000;

/** null when the mix/GW figures can be shown, otherwise why not. */
export function gridDemandUnavailableReason(data: GridDemandPayloadLike | null | undefined, now = Date.now()): string | null {
  if (!data) return 'no_data';
  // Responses without a status come from the old function (frozen 2025 demand).
  if (data.status !== 'ok') return typeof (data as { reason?: unknown }).reason === 'string' ? (data as { reason: string }).reason : 'unavailable';
  if (typeof data.timestamp !== 'string' || Number.isNaN(Date.parse(data.timestamp))) return 'no_timestamp';
  if (ageMinutes(data.timestamp, now) > GRID_DEMAND_MAX_AGE_MINUTES) return 'stale';
  return null;
}

/** Live frequency or null (missing, old, or from a response without a reading time). */
export function liveGridFrequency(data: GridDemandPayloadLike | null | undefined, now = Date.now()): number | null {
  if (!data || typeof data.gridFrequency !== 'number' || !Number.isFinite(data.gridFrequency)) return null;
  if (typeof data.frequencyTime !== 'string' || Number.isNaN(Date.parse(data.frequencyTime))) return null;
  return ageMinutes(data.frequencyTime, now) <= GRID_FREQUENCY_MAX_AGE_MINUTES ? data.gridFrequency : null;
}

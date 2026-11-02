/**
 * BH-127: did Octopus reject the stored API key on the last sync?
 *
 * The sync records 'octopus_http_401' / 'octopus_http_403' in
 * octopus_meters.last_sync_error (get-status returns the meter rows), and
 * clears it on the next good sync or when a new key is saved.
 */
export const KEY_REJECTED_ERRORS: ReadonlySet<string> = new Set([
  'octopus_http_401',
  'octopus_http_403',
]);

interface MeterLike {
  last_sync_error?: string | null;
  last_sync_error_at?: string | null;
}

export interface KeyRejected {
  rejected: boolean;
  /** Most recent time Octopus rejected the key, or null if unknown. */
  at: Date | null;
}

export function octopusKeyRejected(meters: MeterLike[] | null | undefined): KeyRejected {
  let rejected = false;
  let at: Date | null = null;
  for (const m of meters ?? []) {
    if (!m.last_sync_error || !KEY_REJECTED_ERRORS.has(m.last_sync_error)) continue;
    rejected = true;
    const ms = m.last_sync_error_at ? Date.parse(m.last_sync_error_at) : NaN;
    if (Number.isFinite(ms) && (!at || ms > at.getTime())) at = new Date(ms);
  }
  return { rejected, at };
}

/**
 * BH-152: a meter (MPAN) belongs to one GridSense user. octopus_meters is
 * unique on mpan and consumption history is keyed by mpan, so letting a second
 * user upsert the same MPAN would silently move the meter and its history to
 * them. Refuse instead.
 */
export interface MeterOwnerRow {
  mpan: string;
  user_id: string | null;
}

/** MPANs in `rows` that already belong to someone other than `userId`. */
export function mpansOwnedByOthers(rows: MeterOwnerRow[], userId: string): string[] {
  return [...new Set(rows.filter((r) => r.user_id && r.user_id !== userId).map((r) => r.mpan))];
}

export const METER_CLAIMED_MESSAGE =
  'That meter is already linked to another GridSense account. Unlink it there first, then try again.';

/** Rate limiter result when the limiter itself cannot be checked: fail closed. */
export function rateLimitUnavailable(): { allowed: false; retryAfter: number } {
  return { allowed: false, retryAfter: 60 };
}

/**
 * Deleting a user's Octopus-derived data.
 *
 * octopus_consumption and carbon_footprint rows are keyed by MPAN only (no
 * user_id), so they must be deleted *before* the user's octopus_meters rows,
 * or nothing links them back to the user afterwards. Used by octopus-energy
 * `disconnect-account` and by delete-account. The
 * 20261011100000_user_data_cleanup migration adds a database trigger that does
 * the same when a meter row is deleted any other way.
 */

// Minimal surface of the supabase-js query builder we use (keeps this testable).
export interface DeleteResult {
  error: { message: string } | null;
}
export interface UserDataClient {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): PromiseLike<{ data: Array<{ mpan: string }> | null; error: { message: string } | null }>;
    };
    delete(): {
      eq(column: string, value: string): PromiseLike<DeleteResult>;
      in(column: string, values: string[]): PromiseLike<DeleteResult>;
    };
  };
}

export interface OctopusDeletionSummary {
  mpans: number;
  errors: string[];
}

/**
 * Delete footprint, consumption and dispatch rows for the user's meters, then
 * the meters. Credentials are left to the caller (disconnect deletes them first;
 * delete-account deletes them with everything else).
 */
export async function deleteOctopusUsageData(
  client: UserDataClient,
  userId: string,
): Promise<OctopusDeletionSummary> {
  const errors: string[] = [];
  const { data: meters, error: meterError } = await client
    .from('octopus_meters')
    .select('mpan')
    .eq('user_id', userId);
  if (meterError) errors.push(`octopus_meters select: ${meterError.message}`);
  const mpans = (meters ?? []).map((m) => m.mpan).filter(Boolean);

  const steps: Array<[string, PromiseLike<DeleteResult>]> = [
    [
      'octopus_intelligent_dispatches',
      client.from('octopus_intelligent_dispatches').delete().eq('user_id', userId),
    ],
  ];
  if (mpans.length > 0) {
    steps.push(['carbon_footprint', client.from('carbon_footprint').delete().in('mpan', mpans)]);
    steps.push([
      'octopus_consumption',
      client.from('octopus_consumption').delete().in('mpan', mpans),
    ]);
  }
  for (const [table, op] of steps) {
    const { error } = await op;
    if (error) errors.push(`${table}: ${error.message}`);
  }

  // Only drop the meters once their readings are gone (otherwise they'd be orphaned).
  if (errors.length === 0) {
    const { error } = await client.from('octopus_meters').delete().eq('user_id', userId);
    if (error) errors.push(`octopus_meters: ${error.message}`);
  } else {
    errors.push('octopus_meters: skipped because reading deletion failed');
  }
  return { mpans: mpans.length, errors };
}

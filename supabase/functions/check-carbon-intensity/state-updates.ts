/**
 * Decide which alert-state changes may be saved after a push run.
 *
 * A state change that came with a notification is saved only if that
 * notification was delivered. Otherwise the stored state stays as it was, so
 * the next run (every 30 min) sees the same crossing and tries again instead
 * of silently swallowing the alert. Changes with no notification attached
 * (e.g. first evaluation of a new subscription) are always saved.
 */
export interface PendingStateUpdate {
  id: string;
  low_state?: string;
  high_state?: string;
  /** Key of the notification that announces this change, if any. */
  notifyKey?: string;
}

export function selectSavableStateUpdates(
  pending: PendingStateUpdate[],
  deliveredKeys: Set<string>,
): Map<string, { last_intensity_state?: string; last_high_intensity_state?: string }> {
  const out = new Map<
    string,
    { last_intensity_state?: string; last_high_intensity_state?: string }
  >();
  for (const u of pending) {
    if (u.notifyKey && !deliveredKeys.has(u.notifyKey)) continue;
    const row = out.get(u.id) ?? {};
    if (u.low_state) row.last_intensity_state = u.low_state;
    if (u.high_state) row.last_high_intensity_state = u.high_state;
    out.set(u.id, row);
  }
  return out;
}

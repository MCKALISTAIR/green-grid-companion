/**
 * Stable ID namespaces for local notifications.
 * Green/high/daily schedulers must only cancel their own ranges so
 * Power Planner reminders (and other app notifications) survive refreshes.
 */

export const NOTIFICATION_IDS = {
  LIVE_GREEN: 1001,
  DAILY_FORECAST: 9000,
  GREEN_ALERT_MIN: 2000,
  GREEN_ALERT_MAX: 2999,
  HIGH_ALERT_MIN: 8000,
  HIGH_ALERT_MAX: 8999,
  PLANNER_MIN: 10000,
  PLANNER_MAX: 19999,
} as const;

function clampIntoRange(value: number, min: number, max: number): number {
  const span = max - min + 1;
  const normalized = ((value % span) + span) % span;
  return min + normalized;
}

/** Deterministic ID in the green-alert range from a slot start time. */
export function greenAlertId(startTimeMs: number): number {
  return clampIntoRange(
    Math.floor(startTimeMs / 100_000),
    NOTIFICATION_IDS.GREEN_ALERT_MIN,
    NOTIFICATION_IDS.GREEN_ALERT_MAX,
  );
}

/** Deterministic ID in the high-intensity alert range. */
export function highAlertId(startTimeMs: number): number {
  return clampIntoRange(
    Math.floor(startTimeMs / 100_000),
    NOTIFICATION_IDS.HIGH_ALERT_MIN,
    NOTIFICATION_IDS.HIGH_ALERT_MAX,
  );
}

/** Deterministic ID for a Power Planner reminder. */
export function plannerReminderId(startTimeMs: number): number {
  return clampIntoRange(
    Math.floor(startTimeMs / 1000),
    NOTIFICATION_IDS.PLANNER_MIN,
    NOTIFICATION_IDS.PLANNER_MAX,
  );
}

export function isGreenAlertId(id: number): boolean {
  return id >= NOTIFICATION_IDS.GREEN_ALERT_MIN && id <= NOTIFICATION_IDS.GREEN_ALERT_MAX;
}

export function isHighAlertId(id: number): boolean {
  return id >= NOTIFICATION_IDS.HIGH_ALERT_MIN && id <= NOTIFICATION_IDS.HIGH_ALERT_MAX;
}

export function isPlannerReminderId(id: number): boolean {
  return id >= NOTIFICATION_IDS.PLANNER_MIN && id <= NOTIFICATION_IDS.PLANNER_MAX;
}

/** Forecast-scheduled green alerts (not live/daily/planner). */
export function isForecastGreenScheduleId(id: number): boolean {
  return isGreenAlertId(id);
}

export function filterNotificationIds(
  pending: { id: number }[],
  predicate: (id: number) => boolean,
): { id: number }[] {
  return pending.filter((n) => predicate(n.id)).map((n) => ({ id: n.id }));
}

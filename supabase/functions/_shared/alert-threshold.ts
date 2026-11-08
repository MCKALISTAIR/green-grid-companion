export const ALERT_THRESHOLD_MIN = 0;
export const ALERT_THRESHOLD_MAX = 100;
export const DEFAULT_ALERT_THRESHOLD = 100;

export function validAlertThreshold(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0 && value <= 100;
}

export function normalizeAlertThreshold(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : DEFAULT_ALERT_THRESHOLD;
}
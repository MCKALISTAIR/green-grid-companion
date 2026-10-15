import { describe, it, expect } from 'vitest';
import {
  greenAlertId,
  highAlertId,
  plannerReminderId,
  isGreenAlertId,
  isHighAlertId,
  isPlannerReminderId,
  filterNotificationIds,
  NOTIFICATION_IDS,
} from './notificationIds';

describe('notificationIds', () => {
  it('maps green alerts into the reserved range', () => {
    const id = greenAlertId(Date.parse('2026-09-20T14:00:00Z'));
    expect(isGreenAlertId(id)).toBe(true);
    expect(id).toBeGreaterThanOrEqual(NOTIFICATION_IDS.GREEN_ALERT_MIN);
    expect(id).toBeLessThanOrEqual(NOTIFICATION_IDS.GREEN_ALERT_MAX);
  });

  it('maps high alerts into the reserved range', () => {
    const id = highAlertId(Date.parse('2026-09-20T18:00:00Z'));
    expect(isHighAlertId(id)).toBe(true);
  });

  it('maps planner reminders into a range that does not collide with alerts', () => {
    const id = plannerReminderId(Date.parse('2026-09-20T14:00:00Z'));
    expect(isPlannerReminderId(id)).toBe(true);
    expect(isGreenAlertId(id)).toBe(false);
    expect(isHighAlertId(id)).toBe(false);
  });

  it('is deterministic for the same timestamp', () => {
    const t = Date.parse('2026-09-20T14:00:00Z');
    expect(greenAlertId(t)).toBe(greenAlertId(t));
    expect(plannerReminderId(t)).toBe(plannerReminderId(t));
  });

  it('filters pending notifications without touching planner IDs', () => {
    const pending = [{ id: 2100 }, { id: 15000 }, { id: 9000 }, { id: 8050 }];
    const greenOnly = filterNotificationIds(pending, isGreenAlertId);
    expect(greenOnly).toEqual([{ id: 2100 }]);
    expect(pending.find((n) => n.id === 15000)).toBeTruthy();
  });
});

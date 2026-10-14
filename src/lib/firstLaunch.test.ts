import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeFirstNumber,
  countSession,
  markFirstNumberPending,
  shouldNudgeNotifications,
} from './firstLaunch';

const base = {
  sessions: 1,
  usefulMoment: false,
  answered: false,
  permission: 'prompt' as const,
  supported: true,
  alertsAlreadyOn: false,
};

describe('first launch bookkeeping', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('fires the first-number moment once', () => {
    markFirstNumberPending();
    expect(consumeFirstNumber()).toBe(true);
    expect(consumeFirstNumber()).toBe(false);
  });

  it('counts a session once per launch', () => {
    expect(countSession()).toBe(1);
    expect(countSession()).toBe(1);
    sessionStorage.clear();
    expect(countSession()).toBe(2);
  });

  it('never nudges on the first session without a useful moment', () => {
    expect(shouldNudgeNotifications(base)).toBe(false);
  });
  it('nudges after a useful moment or on the second session', () => {
    expect(shouldNudgeNotifications({ ...base, usefulMoment: true })).toBe(true);
    expect(shouldNudgeNotifications({ ...base, sessions: 2 })).toBe(true);
  });
  it('never nudges twice, when alerts are on, or once the OS has answered', () => {
    expect(shouldNudgeNotifications({ ...base, sessions: 3, answered: true })).toBe(false);
    expect(shouldNudgeNotifications({ ...base, sessions: 3, alertsAlreadyOn: true })).toBe(false);
    expect(shouldNudgeNotifications({ ...base, sessions: 3, permission: 'denied' })).toBe(false);
    expect(shouldNudgeNotifications({ ...base, sessions: 3, permission: 'granted' })).toBe(false);
    expect(shouldNudgeNotifications({ ...base, sessions: 3, supported: false })).toBe(false);
  });
});

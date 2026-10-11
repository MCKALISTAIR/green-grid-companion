import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION_KEY,
  clearConsent,
  describeConsent,
  getConsent,
  hasOptionalConsent,
  onConsentChange,
  setConsent,
} from './consent';

describe('consent', () => {
  beforeEach(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    localStorage.removeItem(CONSENT_VERSION_KEY);
  });

  it('is unset by default', () => {
    expect(getConsent()).toBeNull();
    expect(hasOptionalConsent()).toBe(false);
  });

  it('ignores legacy unversioned "accepted" written by old onboarding', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    expect(getConsent()).toBeNull();
    expect(hasOptionalConsent()).toBe(false);
  });

  it('records accept and decline', () => {
    setConsent('accepted');
    expect(getConsent()).toBe('accepted');
    expect(hasOptionalConsent()).toBe(true);
    setConsent('declined');
    expect(getConsent()).toBe('declined');
    expect(hasOptionalConsent()).toBe(false);
  });

  it('notifies listeners and clears', () => {
    const listener = vi.fn();
    const off = onConsentChange(listener);
    setConsent('accepted');
    clearConsent();
    off();
    setConsent('declined');
    expect(listener.mock.calls).toEqual([['accepted'], [null]]);
    expect(describeConsent(getConsent())).toBe('Essential only');
  });
});

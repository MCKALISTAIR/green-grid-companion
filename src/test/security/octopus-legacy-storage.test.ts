import { describe, it, expect, beforeEach } from 'vitest';
import { takeLegacyOctopusCredentials, LEGACY_OCTOPUS_STORAGE_KEYS } from '@/lib/octopusLegacyStorage';

describe('takeLegacyOctopusCredentials', () => {
  beforeEach(() => localStorage.clear());

  it('removes cached API keys and returns them once when they were never synced', () => {
    localStorage.setItem(LEGACY_OCTOPUS_STORAGE_KEYS.credentials, JSON.stringify({ apiKey: 'sk_live_x', accountNumber: 'A-12345678' }));
    localStorage.setItem(LEGACY_OCTOPUS_STORAGE_KEYS.pendingSync, 'true');

    const first = takeLegacyOctopusCredentials(localStorage);
    expect(first).toEqual({ credentials: { apiKey: 'sk_live_x', accountNumber: 'A-12345678' }, pendingSync: true });
    expect(localStorage.getItem(LEGACY_OCTOPUS_STORAGE_KEYS.credentials)).toBeNull();
    expect(localStorage.getItem(LEGACY_OCTOPUS_STORAGE_KEYS.pendingSync)).toBeNull();

    expect(takeLegacyOctopusCredentials(localStorage)).toEqual({ credentials: null, pendingSync: false });
  });

  it('clears already-synced keys (pendingSync=false)', () => {
    localStorage.setItem(LEGACY_OCTOPUS_STORAGE_KEYS.credentials, JSON.stringify({ apiKey: 'sk_live_x', accountNumber: 'A-1' }));
    const r = takeLegacyOctopusCredentials(localStorage);
    expect(r.pendingSync).toBe(false);
    expect(localStorage.getItem(LEGACY_OCTOPUS_STORAGE_KEYS.credentials)).toBeNull();
  });

  it('clears corrupt entries without throwing', () => {
    localStorage.setItem(LEGACY_OCTOPUS_STORAGE_KEYS.credentials, '{not json');
    localStorage.setItem(LEGACY_OCTOPUS_STORAGE_KEYS.pendingSync, 'true');
    expect(takeLegacyOctopusCredentials(localStorage)).toEqual({ credentials: null, pendingSync: false });
    expect(localStorage.length).toBe(0);
  });

  it('handles missing storage', () => {
    expect(takeLegacyOctopusCredentials(null)).toEqual({ credentials: null, pendingSync: false });
  });
});

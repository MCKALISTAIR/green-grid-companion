import { describe, it, expect } from 'vitest';
import {
  normalizeSubscriptionPostcode,
  NATIONAL_POSTCODE,
} from '../../supabase/functions/_shared/subscription-postcode';

describe('normalizeSubscriptionPostcode', () => {
  it('accepts outward codes, full postcodes (stores outward only), and GB', () => {
    expect(normalizeSubscriptionPostcode('sw1a')).toBe('SW1A');
    expect(normalizeSubscriptionPostcode('SW1A 1AA')).toBe('SW1A');
    expect(normalizeSubscriptionPostcode('eh11aa')).toBe('EH1');
    expect(normalizeSubscriptionPostcode('gb')).toBe(NATIONAL_POSTCODE);
    expect(normalizeSubscriptionPostcode('GB')).toBe('GB');
  });

  it('rejects place names, empty values, and non-strings', () => {
    expect(normalizeSubscriptionPostcode('Scotland')).toBeNull();
    expect(normalizeSubscriptionPostcode('')).toBeNull();
    expect(normalizeSubscriptionPostcode('   ')).toBeNull();
    expect(normalizeSubscriptionPostcode(null)).toBeNull();
    expect(normalizeSubscriptionPostcode(12)).toBeNull();
  });
});

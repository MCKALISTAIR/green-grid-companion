import { describe, it, expect } from 'vitest';
import { REGIONAL_FALLBACK_LABEL, regionalFallbackMessage } from './regionalFallback';

describe('BH-29 fallback copy', () => {
  it('pill says GB average', () => expect(REGIONAL_FALLBACK_LABEL).toBe('GB average'));
  it('names the region in the explanation', () => {
    expect(regionalFallbackMessage('South Scotland')).toBe(
      'South Scotland figure unavailable right now, so this is the GB average.',
    );
  });
  it('has a fallback when the region name is missing', () => {
    expect(regionalFallbackMessage(undefined)).toBe(
      'Your region figure unavailable right now, so this is the GB average.',
    );
  });
});

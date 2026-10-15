import { describe, it, expect } from 'vitest';
import { offGridArea, isValidPostcode } from '@/lib/postcode';
import { regionNameForPostcode } from '@/lib/regionMatch';

describe('offGridArea (BH-11/12/13)', () => {
  it.each([
    ['GY1 1AA', 'channelIslands'],
    ['gy9', 'channelIslands'],
    ['JE2 3AB', 'channelIslands'],
    ['IM1 1AA', 'isleOfMan'],
    ['BT1 1AA', 'northernIreland'],
    ['BFPO 1', 'bfpo'],
    ['bfpo123', 'bfpo'],
  ])('%s → %s', (pc, area) => {
    expect(offGridArea(pc)).toBe(area);
  });

  it.each(['SW1A 1AA', 'G1', 'GL1', 'IP1', 'JE', 'GB', '', null])('%s is not off-grid', (pc) => {
    expect(offGridArea(pc as string)).toBeNull();
  });

  it('crown dependency outcodes never resolve to a GB region locally', () => {
    for (const pc of ['GY1', 'JE2', 'IM1', 'BT1'])
      expect(regionNameForPostcode(pc)).toBeUndefined();
  });

  it('BFPO is not a GB postcode format, so the onboarding check must use offGridArea first', () => {
    expect(isValidPostcode('BFPO 1')).toBe(false);
    expect(offGridArea('BFPO 1')).toBe('bfpo');
  });
});

import { describe, expect, it } from 'vitest';
import { OCTOPUS_STALE_AFTER_MS, octopusFreshness } from './octopusFreshness';

const now = new Date('2026-10-29T20:00:00Z');

describe('octopusFreshness (BH-127)', () => {
  it('no readings is not stale, just empty', () => {
    expect(octopusFreshness(null, now)).toMatchObject({ newest: null, stale: false });
    expect(octopusFreshness('nonsense', now).stale).toBe(false);
  });

  it('a reading from yesterday is fresh', () => {
    expect(octopusFreshness('2026-10-28T23:30:00+00:00', now).stale).toBe(false);
  });

  it('exactly 48h is still fresh, just over is stale', () => {
    const at = (ms: number) => new Date(now.getTime() - ms).toISOString();
    expect(octopusFreshness(at(OCTOPUS_STALE_AFTER_MS), now).stale).toBe(false);
    expect(octopusFreshness(at(OCTOPUS_STALE_AFTER_MS + 1), now).stale).toBe(true);
  });

  it('the live BH-127 case (newest 30 Jul) is stale and labelled with its date', () => {
    const f = octopusFreshness('2026-07-30T22:30:00+00:00', now);
    expect(f.stale).toBe(true);
    expect(f.newestLabel).toMatch(/30 Jul/);
  });
});

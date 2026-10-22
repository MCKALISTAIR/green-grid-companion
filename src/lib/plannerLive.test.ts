import { describe, it, expect } from 'vitest';
import { plannerLiveIntensity } from './plannerLive';

const ready = { isLoading: false, isError: false, hasReading: true };

describe('plannerLiveIntensity', () => {
  it('keeps a real 0 g reading (net zero)', () => {
    expect(plannerLiveIntensity(0, ready)).toBe(0);
  });
  it('passes real readings through', () => {
    expect(plannerLiveIntensity(142, ready)).toBe(142);
  });
  it('is null while loading, on error, or with only the 0 placeholder', () => {
    expect(plannerLiveIntensity(0, { ...ready, hasReading: false })).toBeNull();
    expect(plannerLiveIntensity(120, { ...ready, isLoading: true })).toBeNull();
    expect(plannerLiveIntensity(120, { ...ready, isError: true })).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { getConditionLabel } from './conditionLabels';

describe('getConditionLabel', () => {
  it('returns official band names for friendly tone', () => {
    expect(getConditionLabel('very low', 'friendly')).toBe('Very low');
    expect(getConditionLabel('LOW', 'friendly')).toBe('Low');
    expect(getConditionLabel('Very High', 'friendly')).toBe('Very high');
  });

  it('returns a snarky variant when tone is snarky', () => {
    const label = getConditionLabel('very high', 'snarky', 'test');
    expect(['Proper filthy', 'Hide the kettle', 'Air tastes beige']).toContain(label);
  });

  it('is stable for the same salt', () => {
    const a = getConditionLabel('low', 'snarky', 'london');
    const b = getConditionLabel('low', 'snarky', 'london');
    expect(a).toBe(b);
  });

  it('falls back to the raw index when unknown', () => {
    expect(getConditionLabel('mystery', 'friendly')).toBe('mystery');
  });
});

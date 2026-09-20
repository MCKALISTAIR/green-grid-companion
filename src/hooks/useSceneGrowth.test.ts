import { describe, expect, it } from 'vitest';
import { gardenDaysToStage } from './useSceneGrowth';

describe('gardenDaysToStage', () => {
  it('maps day thresholds to growth stages', () => {
    expect(gardenDaysToStage(0)).toBe(0);
    expect(gardenDaysToStage(0.9)).toBe(0);
    expect(gardenDaysToStage(1)).toBe(1);
    expect(gardenDaysToStage(3)).toBe(2);
    expect(gardenDaysToStage(7)).toBe(3);
    expect(gardenDaysToStage(14)).toBe(4);
    expect(gardenDaysToStage(40)).toBe(4);
  });
});

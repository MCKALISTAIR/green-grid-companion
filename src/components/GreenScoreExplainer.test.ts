import { describe, expect, it } from 'vitest';
import { getGreenScoreRating } from '@/components/GreenScoreExplainer';

describe('getGreenScoreRating', () => {
  it('maps percentages to consistent labels', () => {
    expect(getGreenScoreRating(85)).toBe('Excellent');
    expect(getGreenScoreRating(70)).toBe('Excellent');
    expect(getGreenScoreRating(55)).toBe('Good');
    expect(getGreenScoreRating(50)).toBe('Good');
    expect(getGreenScoreRating(40)).toBe('Fair');
    expect(getGreenScoreRating(30)).toBe('Fair');
    expect(getGreenScoreRating(10)).toBe('Growing');
  });
});

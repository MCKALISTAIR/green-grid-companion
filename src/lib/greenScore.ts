export type GreenScoreRating = 'Excellent' | 'Good' | 'Fair' | 'Growing';

/** Align rating labels everywhere Green Score appears. */
export function getGreenScoreRating(greenPercentage: number): GreenScoreRating {
  if (greenPercentage >= 70) return 'Excellent';
  if (greenPercentage >= 50) return 'Good';
  if (greenPercentage >= 30) return 'Fair';
  return 'Growing';
}

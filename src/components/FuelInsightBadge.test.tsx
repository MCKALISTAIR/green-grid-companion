import { render } from '@testing-library/react';
import { FuelInsightBadge } from './FuelInsightBadge';

const streak = {
  fuel: 'gas',
  days: 3,
  hours: 0,
  isActive: true,
  isNewRecord: true,
  isVerified: true,
};

describe('FuelInsightBadge solid treatments', () => {
  it('uses a solid existing tint for a new streak record', () => {
    const { getByText } = render(<FuelInsightBadge streak={streak} />);
    const badge = getByText(/^New record!/).parentElement!;
    expect(badge).toHaveClass('bg-chart-4/15');
    expect(badge.className).not.toContain('bg-gradient');
  });

  it('uses the existing primary tint and no celebration emoji for a high milestone', () => {
    const { getByText } = render(
      <FuelInsightBadge
        milestone={{
          fuel: 'wind',
          type: 'high',
          currentPerc: 55,
          previousBest: 50,
          periodDays: 14,
        }}
      />,
    );
    const badge = getByText('Wind at highest share in 2w!').parentElement!;
    expect(badge).toHaveClass('bg-primary/10');
    expect(badge.className).not.toContain('bg-gradient');
    expect(badge.textContent).not.toContain('🎉');
  });
});

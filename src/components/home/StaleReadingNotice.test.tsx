import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StaleReadingNotice } from './StaleReadingNotice';
import { isReadingStale } from '@/lib/voice/statesCopy';

const NOW = Date.parse('2026-10-15T20:00:00Z');

describe('stale reading labelling', () => {
  it('a reading from this or the last half hour is not stale', () => {
    expect(isReadingStale('2026-10-15T19:30:00Z', NOW)).toBe(false);
    expect(isReadingStale('2026-10-15T19:00:00Z', NOW)).toBe(false);
    expect(isReadingStale(undefined, NOW)).toBe(false);
    expect(isReadingStale('not a date', NOW)).toBe(false);
  });

  it('over an hour old is stale', () => {
    expect(isReadingStale('2026-10-15T18:30:00Z', NOW)).toBe(true);
  });

  it('shows the London time of the last reading and a retry', () => {
    const retry = vi.fn();
    render(<StaleReadingNotice readingFrom="2026-10-15T13:30:00Z" onRetry={retry} nowMs={NOW} />);
    expect(screen.getByText('This might be out of date')).toBeInTheDocument();
    expect(
      screen.getByText(
        'We could not refresh, so you are seeing the figure from 14:30. Plan with care.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
  });

  it('renders nothing for a fresh reading', () => {
    const { container } = render(
      <StaleReadingNotice readingFrom="2026-10-15T19:30:00Z" onRetry={() => {}} nowMs={NOW} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

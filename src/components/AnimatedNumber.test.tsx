import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AnimatedNumber } from './AnimatedNumber';

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true, // snap immediately in tests
}));

describe('AnimatedNumber', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the formatted value with suffix', () => {
    render(<AnimatedNumber value={51.3} decimals={1} suffix="%" />);
    expect(screen.getByText('51.3%')).toBeInTheDocument();
  });

  it('updates when the value changes', () => {
    const { rerender } = render(<AnimatedNumber value={18.6} decimals={1} suffix="%" />);
    expect(screen.getByText('18.6%')).toBeInTheDocument();

    act(() => {
      rerender(<AnimatedNumber value={22.4} decimals={1} suffix="%" />);
    });
    expect(screen.getByText('22.4%')).toBeInTheDocument();
  });

  it('formats GW with two decimals', () => {
    render(<AnimatedNumber value={17.58} decimals={2} suffix=" GW" />);
    expect(screen.getByText('17.58 GW')).toBeInTheDocument();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AlertTriangle } from 'lucide-react';
import { ErrorStateCard } from './ErrorStateCard';
import { SlowLoadingNotice } from '@/components/SlowLoadingNotice';
import { OutageCard } from '@/components/home/OutageCard';
import { TONE_STORAGE_KEY } from '@/lib/tone';

describe('ErrorStateCard', () => {
  it('renders title, body and 44px actions', () => {
    const fn = vi.fn();
    render(
      <ErrorStateCard
        tint="red"
        icon={AlertTriangle}
        title="T"
        body="B"
        actions={[{ label: 'Go', onClick: fn, kind: 'destructive' }]}
      />,
    );
    const b = screen.getByRole('button', { name: 'Go' });
    expect(b.className).toContain('min-h-11');
    fireEvent.click(b);
    expect(fn).toHaveBeenCalled();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});

describe('tone', () => {
  beforeEach(() => localStorage.clear());

  it('outage follows the tone setting', () => {
    localStorage.setItem(TONE_STORAGE_KEY, 'plain');
    const { unmount } = render(<OutageCard onRetry={() => {}} />);
    expect(screen.getByText(/This is on their side, not your phone\./)).toBeInTheDocument();
    unmount();
    localStorage.setItem(TONE_STORAGE_KEY, 'cheeky');
    render(<OutageCard onRetry={() => {}} />);
    expect(screen.getByText('NESO has gone quiet. Not your phone, promise.')).toBeInTheDocument();
  });

  it('slow appears only after 8 s, with the Cheeky line by default', () => {
    vi.useFakeTimers();
    render(<SlowLoadingNotice active onRetry={() => {}} />);
    expect(screen.queryByText('Still waiting for NESO')).toBeNull();
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByText('Still waiting for NESO')).toBeInTheDocument();
    expect(
      screen.getByText('NESO is having a long think. Over 8 seconds so far.'),
    ).toBeInTheDocument();
    vi.useRealTimers();
  });
});

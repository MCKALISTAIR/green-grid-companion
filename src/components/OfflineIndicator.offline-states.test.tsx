import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OfflineIndicator, resetOfflineWarningForTests } from './OfflineIndicator';
import { setHeroStatusSlot } from '@/lib/heroStatusSlot';
import { OfflineEmptyState } from '@/components/errors/OfflineEmptyState';

const notification = vi.fn();
vi.mock('@/hooks/useHaptics', () => ({ useHaptics: () => ({ notification }) }));

beforeEach(() => {
  notification.mockClear();
  resetOfflineWarningForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
  setHeroStatusSlot(null);
});

describe('OfflineIndicator reconnect', () => {
  it('refreshes automatically on reconnect', async () => {
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue();
    render(
      <QueryClientProvider client={client}>
        <OfflineIndicator />
      </QueryClientProvider>,
    );
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    expect(refetch).toHaveBeenCalledWith({ type: 'active' });
  });
});

describe('Offline: pill vs full state (Design call)', () => {
  it('hides the offline pill while Home shows the full offline state', async () => {
    localStorage.setItem('gridgreen-fact-prefs', 'plain');
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue();
    render(
      <QueryClientProvider client={client}>
        <OfflineIndicator />
        <OfflineEmptyState />
      </QueryClientProvider>,
    );
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.queryByTestId('connection-pill')).toBeNull();
    // No pill, and the card has no "You're offline." title (BH-89): the
    // hero's "Offline" is the one offline message on Home.
    expect(screen.queryAllByText(/offline/i)).toHaveLength(0);
    const card = screen.getByTestId('offline-empty-state');
    expect(card).not.toHaveTextContent(/you're offline/i);
    expect(card.querySelector('h3')).toBeNull();
    expect(card).toHaveTextContent('Nothing saved yet.');
    expect(card).toHaveTextContent("We'll refresh automatically when you're back online.");
    fireEvent.click(screen.getByRole('button', { name: 'Try now' }));
    expect(refetch).toHaveBeenCalledWith({ type: 'active' }, { cancelRefetch: false });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    localStorage.clear();
  });

  it('uses the Cheeky line in the full state when Cheeky is on', () => {
    localStorage.setItem('gridgreen-fact-prefs', 'cheeky');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OfflineEmptyState />
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('offline-empty-state')).toHaveTextContent(
      'Nothing saved yet. The grid carries on without us.',
    );
    localStorage.clear();
  });
});

describe('Offline pill Retry (Design call, BH-78)', () => {
  it('carries Retry while offline and refetches active queries', async () => {
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue();
    render(
      <QueryClientProvider client={client}>
        <OfflineIndicator />
      </QueryClientProvider>,
    );
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    const pill = screen.getByTestId('connection-pill');
    expect(pill).toHaveTextContent('Offline · nothing saved yet');
    // One visible offline message; the sr-only full form is for screen readers.
    const visible = screen
      .getAllByText(/offline/i)
      .filter((el) => !el.classList.contains('sr-only'));
    expect(visible).toHaveLength(1);
    expect(pill).toHaveTextContent('Offline. Nothing saved yet.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledWith({ type: 'active' }, { cancelRefetch: false });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
  });

  it('drops Retry once back online', async () => {
    const client = new QueryClient();
    vi.spyOn(client, 'refetchQueries').mockResolvedValue();
    render(
      <QueryClientProvider client={client}>
        <OfflineIndicator />
      </QueryClientProvider>,
    );
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByTestId('connection-pill')).toHaveTextContent('Back online');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});

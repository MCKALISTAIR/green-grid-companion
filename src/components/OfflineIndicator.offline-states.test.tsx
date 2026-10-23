import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OfflineIndicator, BACK_ONLINE_MS, resetOfflineWarningForTests } from './OfflineIndicator';
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
    // Exactly one offline message: the full state's title, no pill.
    expect(screen.getAllByText(/offline/i)).toHaveLength(1);
    const card = screen.getByTestId('offline-empty-state');
    expect(card).toHaveTextContent("You're offline.");
    expect(card).toHaveTextContent('Nothing saved yet.');
    expect(card).toHaveTextContent('We will refresh automatically when you are back online.');
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
    expect(screen.getAllByText(/offline/i)).toHaveLength(1);
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

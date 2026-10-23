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
    expect(screen.queryByTestId('offline-banner')).toBeNull();
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

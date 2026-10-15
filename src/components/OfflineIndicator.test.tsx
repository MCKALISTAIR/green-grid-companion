import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OfflineIndicator } from './OfflineIndicator';

vi.mock('@/hooks/useHaptics', () => ({ useHaptics: () => ({ notification: vi.fn() }) }));

afterEach(() => vi.restoreAllMocks());

describe('OfflineIndicator back-online Refresh', () => {
  it('refetches queries in place instead of reloading the page', async () => {
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue();
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
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
    fireEvent.click(await screen.findByRole('button', { name: /refresh/i }));
    expect(refetch).toHaveBeenCalledWith({ type: 'active' });
    expect(reload).not.toHaveBeenCalled();
  });

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

describe('OfflineIndicator offline banner (Design state 12)', () => {
  it('shows the offline copy and a Try now action in the banner', async () => {
    localStorage.setItem('gridgreen-fact-prefs', 'plain');
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
    const banner = await screen.findByTestId('offline-banner');
    expect(banner).toHaveTextContent("You're offline.");
    expect(banner).toHaveTextContent('We will refresh automatically when you are back online.');
    fireEvent.click(screen.getByRole('button', { name: 'Try now' }));
    expect(refetch).toHaveBeenCalledWith({ type: 'active' });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    localStorage.clear();
  });
});

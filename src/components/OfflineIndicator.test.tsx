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
});

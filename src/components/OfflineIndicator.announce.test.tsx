import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OfflineIndicator } from './OfflineIndicator';
import { PILL_TICK_MS, resetOfflineWarningForTests } from '@/lib/offlineIndicatorState';
import { setHeroReadingAt } from '@/lib/offlineReadingTime';
import { useStableAnnouncement } from '@/hooks/useStableAnnouncement';

// Design call (#178): the pill's live region (aria-live="polite") announces
// only when the offline state or the day band changes, never on re-renders
// or clock ticks within the same band.

vi.mock('@/hooks/useHaptics', () => ({ useHaptics: () => ({ notification: vi.fn() }) }));

describe('useStableAnnouncement', () => {
  it('keeps the text while the key is the same, and updates when it changes', () => {
    const { result, rerender } = renderHook(
      ({ k, t }: { k: string; t: string }) => useStableAnnouncement(k, t),
      { initialProps: { k: 'offline:today', t: 'first' } },
    );
    expect(result.current).toBe('first');
    rerender({ k: 'offline:today', t: 'second' });
    expect(result.current).toBe('first');
    rerender({ k: 'offline:yesterday', t: 'third' });
    expect(result.current).toBe('third');
  });
});

describe('OfflineIndicator live region', () => {
  // Thu 22 Oct 2026 07:00 BST reading.
  const READING = Date.UTC(2026, 9, 22, 6, 0);

  beforeEach(() => {
    resetOfflineWarningForTests();
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    // Thu 22 Oct 2026 23:57 BST: three minutes before UK midnight.
    vi.setSystemTime(Date.UTC(2026, 9, 22, 22, 57));
  });
  afterEach(() => {
    act(() => setHeroReadingAt(null));
    vi.useRealTimers();
  });

  it('is polite, stays put on re-renders and ticks, and changes when the band does', async () => {
    const client = new QueryClient();
    const ui = (
      <QueryClientProvider client={client}>
        <OfflineIndicator />
      </QueryClientProvider>
    );
    const { rerender } = render(ui);
    act(() => setHeroReadingAt(READING));
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    const announcement = screen.getByTestId('connection-pill-announcement');
    expect(announcement).toHaveTextContent('Offline. Reading from 07:00');

    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((m) => mutations.push(...m));
    observer.observe(announcement, { childList: true, characterData: true, subtree: true });

    // Re-renders and two minute ticks, still Thursday: nothing announced.
    rerender(ui);
    rerender(ui);
    await act(async () => {
      vi.advanceTimersByTime(PILL_TICK_MS * 2); // 23:59 BST
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(announcement).toHaveTextContent('Offline. Reading from 07:00');
    expect(mutations).toHaveLength(0);

    // Past UK midnight: the band changes, so the announced text changes once.
    await act(async () => {
      vi.advanceTimersByTime(PILL_TICK_MS * 2); // 00:01 BST Fri
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('connection-pill-announcement')).toHaveTextContent(
      'Offline. Reading from yesterday at 07:00',
    );
    expect(screen.getByTestId('connection-pill')).toHaveTextContent(
      'Offline · figures from yesterday 07:00',
    );
    expect(mutations.length).toBeGreaterThan(0);
    const afterBand = mutations.length;

    // More ticks in the new band: no further changes.
    await act(async () => {
      vi.advanceTimersByTime(PILL_TICK_MS * 5);
    });
    rerender(ui);
    expect(mutations).toHaveLength(afterBand);
    observer.disconnect();

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
  });
});

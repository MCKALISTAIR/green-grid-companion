import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cachedReadingAt, setHeroReadingAt, type CachedQueryLike } from './offlineReadingTime';
import { offlinePillText } from '@/lib/voice/statesCopy';
import { OfflineIndicator, resetOfflineWarningForTests } from '@/components/OfflineIndicator';

// BH-88: the offline pill shows the reading's own time in UK time, never when
// the app saved it.

const utc = (iso: string) => Date.parse(iso);
const q = (queryKey: unknown[], data: unknown, dataUpdatedAt: number): CachedQueryLike => ({
  queryKey,
  state: { data, dataUpdatedAt },
});

// 23 Oct 2026 is BST (UTC+1): 07:00 BST reading, saved at 08:30 BST.
const READING_0700_BST = '2026-10-23T06:00Z';
const SAVED_0830_BST = utc('2026-10-23T07:30:00Z');

afterEach(() => {
  setHeroReadingAt(null);
  resetOfflineWarningForTests();
});

describe('offlinePillText (BH-88)', () => {
  it('a 07:00 reading saved at 08:30 shows 07:00', () => {
    expect(offlinePillText(utc(READING_0700_BST))).toBe('Offline · figures from 07:00');
  });

  it('nothing saved', () => {
    expect(offlinePillText(null)).toBe('Offline · nothing saved yet');
  });

  // 25 Oct 2026: BST ends, clocks go back at 02:00 BST to 01:00 GMT.
  it('across the clock change on 25 Oct 2026: UK time either side', () => {
    // Saturday 24 Oct, still BST: 06:00 UTC is 07:00.
    expect(offlinePillText(utc('2026-10-24T06:00Z'))).toBe('Offline · figures from 07:00');
    // Sunday 25 Oct, now GMT: 07:00 UTC is 07:00, and 06:00 UTC is 06:00.
    expect(offlinePillText(utc('2026-10-25T07:00Z'))).toBe('Offline · figures from 07:00');
    expect(offlinePillText(utc('2026-10-25T06:00Z'))).toBe('Offline · figures from 06:00');
  });

  it('the repeated 01:00 hour on 25 Oct 2026 says BST or GMT', () => {
    expect(offlinePillText(utc('2026-10-25T00:30Z'))).toBe('Offline · figures from 01:30 BST');
    expect(offlinePillText(utc('2026-10-25T01:30Z'))).toBe('Offline · figures from 01:30 GMT');
  });
});

describe('cachedReadingAt (BH-88)', () => {
  it('uses the national reading time, not the save time', () => {
    const at = cachedReadingAt([
      q(['national'], { from: READING_0700_BST, to: '2026-10-23T06:30Z' }, SAVED_0830_BST),
    ]);
    expect(at).toBe(utc(READING_0700_BST));
  });

  it('uses the first slot of a regional reading and skips the region list', () => {
    const at = cachedReadingAt([
      q(['regional', 'all'], [{ regionid: 1, from: '2026-10-23T07:30Z' }], SAVED_0830_BST),
      q(['regional', 3], { regionid: 3, data: [{ from: READING_0700_BST }] }, SAVED_0830_BST),
    ]);
    expect(at).toBe(utc(READING_0700_BST));
  });

  it('uses the forecast slot that had started when saved, never a future slot', () => {
    const at = cachedReadingAt([
      q(
        ['forecast', undefined, 'GB'],
        [
          { from: '2026-10-23T06:30Z' },
          { from: '2026-10-23T07:00Z' },
          { from: '2026-10-23T07:30Z' }, // starts exactly at save time
          { from: '2026-10-23T08:00Z' }, // future
        ],
        SAVED_0830_BST,
      ),
    ]);
    expect(at).toBe(utc('2026-10-23T07:30Z'));
  });

  it('ignores non-carbon queries and empty data', () => {
    expect(
      cachedReadingAt([
        q(['generation'], { from: '2026-10-23T07:30Z' }, SAVED_0830_BST),
        q(['national'], undefined, SAVED_0830_BST),
      ]),
    ).toBeNull();
  });
});

describe('OfflineIndicator pill time (BH-88)', () => {
  function renderWithCache(setup: (client: QueryClient) => void) {
    const client = new QueryClient();
    setup(client);
    render(
      <QueryClientProvider client={client}>
        <OfflineIndicator />
      </QueryClientProvider>,
    );
  }

  it('a 07:00 reading cached at 08:30 shows 07:00 (from the cache)', async () => {
    renderWithCache((client) =>
      client.setQueryData(
        ['national'],
        { from: READING_0700_BST, to: '2026-10-23T06:30Z' },
        { updatedAt: SAVED_0830_BST },
      ),
    );
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('connection-pill')).toHaveTextContent('Offline · figures from 07:00');
    expect(screen.getByTestId('connection-pill')).not.toHaveTextContent('08:30');
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
  });

  it("prefers the reading Home's hero shows", async () => {
    renderWithCache((client) =>
      client.setQueryData(
        ['national'],
        { from: '2026-10-23T07:30Z' },
        { updatedAt: SAVED_0830_BST },
      ),
    );
    act(() => setHeroReadingAt(utc(READING_0700_BST)));
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('connection-pill')).toHaveTextContent('Offline · figures from 07:00');
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
  });
});

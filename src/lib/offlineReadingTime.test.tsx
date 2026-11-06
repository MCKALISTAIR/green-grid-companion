import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cachedReadingAt, setHeroReadingAt, type CachedQueryLike } from './offlineReadingTime';
import {
  londonDaysAgo,
  offlinePillLabel,
  offlinePillText,
  readingWhen,
} from '@/lib/voice/statesCopy';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { resetOfflineWarningForTests } from '@/lib/offlineIndicatorState';

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
  const NOW_0830_BST = SAVED_0830_BST; // Fri 23 Oct 2026 08:30 BST
  const pill = (iso: string, now = NOW_0830_BST) => offlinePillText(utc(iso), now);
  const label = (iso: string, now = NOW_0830_BST) => offlinePillLabel(utc(iso), now);

  it('a 07:00 reading saved at 08:30 shows 07:00', () => {
    expect(pill(READING_0700_BST)).toBe('Offline · figures from 07:00');
    expect(label(READING_0700_BST)).toBe('Offline. Reading from 07:00');
  });

  it('nothing saved', () => {
    expect(offlinePillText(null)).toBe('Offline · nothing saved yet');
    expect(offlinePillLabel(null)).toBe('Offline. Nothing saved yet.');
  });

  describe('day bands (Design call, #178), UK time', () => {
    it('today: time only', () => {
      expect(pill('2026-10-22T23:00Z')).toBe('Offline · figures from 00:00'); // 00:00 BST today
    });
    it('yesterday: lower case mid-line, "yesterday 07:00"', () => {
      expect(pill('2026-10-22T06:00Z')).toBe('Offline · figures from yesterday 07:00');
      expect(label('2026-10-22T06:00Z')).toBe('Offline. Reading from yesterday at 07:00');
    });
    it('2 to 6 days ago: short weekday', () => {
      expect(pill('2026-10-21T06:00Z')).toBe('Offline · figures from Wed 07:00'); // 2 days
      expect(label('2026-10-21T06:00Z')).toBe('Offline. Reading from Wednesday at 07:00');
      expect(pill('2026-10-17T06:00Z')).toBe('Offline · figures from Sat 07:00'); // 6 days
    });
    it('readingWhen capitalises "Yesterday" only when it starts the text', () => {
      const r = utc('2026-10-22T06:00Z');
      expect(readingWhen(r, NOW_0830_BST)).toBe('yesterday 07:00');
      expect(readingWhen(r, NOW_0830_BST, { atStart: true })).toBe('Yesterday 07:00');
      expect(readingWhen(utc('2026-10-21T06:00Z'), NOW_0830_BST, { atStart: true })).toBe(
        'Wed 07:00',
      );
    });
    it('7 or more days ago: the date', () => {
      expect(pill('2026-10-16T06:00Z')).toBe('Offline · figures from 16 Oct'); // 7 days
      expect(pill('2026-10-05T06:00Z')).toBe('Offline · figures from 5 Oct');
      expect(label('2026-10-12T06:00Z')).toBe('Offline. Reading from 12 October');
      expect(pill('2026-10-12T06:00Z')).toBe('Offline · figures from 12 Oct');
    });
  });

  describe('around UK midnight', () => {
    // 23:59 BST on Thu 22 Oct is 22:59 UTC; 00:00 BST on Fri 23 Oct is 23:00 UTC on the 22nd.
    it('23:59 the day before is yesterday, 00:00 is today', () => {
      expect(pill('2026-10-22T22:59Z')).toBe('Offline · figures from yesterday 23:59');
      expect(pill('2026-10-22T23:00Z')).toBe('Offline · figures from 00:00');
    });
    it('just after midnight, a 23:30 reading is yesterday', () => {
      const now = utc('2026-10-22T23:00:30Z'); // 00:00:30 BST Fri
      expect(pill('2026-10-22T22:30Z', now)).toBe('Offline · figures from yesterday 23:30');
    });
    it('just before midnight, a 00:00 reading is still today', () => {
      const now = utc('2026-10-23T22:59:59Z'); // 23:59:59 BST Fri
      expect(pill('2026-10-22T23:00Z', now)).toBe('Offline · figures from 00:00');
    });
    it('6 vs 7 days at midnight', () => {
      const now = utc('2026-10-22T23:00Z'); // 00:00 BST Fri 23 Oct
      expect(pill('2026-10-16T23:00Z', now)).toBe('Offline · figures from Sat 00:00'); // 6 days
      expect(pill('2026-10-16T22:59Z', now)).toBe('Offline · figures from 16 Oct'); // 7 days
    });
  });

  // 25 Oct 2026: BST ends, clocks go back at 02:00 BST to 01:00 GMT.
  describe('clock-change night, 25 Oct 2026', () => {
    const SUN_0830_GMT = utc('2026-10-25T08:30Z');
    it('UK time either side of the change', () => {
      expect(pill('2026-10-25T07:00Z', SUN_0830_GMT)).toBe('Offline · figures from 07:00');
      expect(pill('2026-10-25T06:00Z', SUN_0830_GMT)).toBe('Offline · figures from 06:00');
      // Saturday 24 Oct, still BST: 06:00 UTC is 07:00.
      expect(pill('2026-10-24T06:00Z', SUN_0830_GMT)).toBe(
        'Offline · figures from yesterday 07:00',
      );
    });
    it('the repeated 01:00 hour says BST or GMT', () => {
      expect(pill('2026-10-25T00:30Z', SUN_0830_GMT)).toBe('Offline · figures from 01:30 BST');
      expect(pill('2026-10-25T01:30Z', SUN_0830_GMT)).toBe('Offline · figures from 01:30 GMT');
      expect(label('2026-10-25T01:30Z', SUN_0830_GMT)).toBe(
        'Offline. Reading from 1:30 am GMT, after the clocks went back',
      );
    });
    it('the repeated hour keeps its tag the next day, with yesterday', () => {
      const MON_0830_GMT = utc('2026-10-26T08:30Z');
      expect(pill('2026-10-25T00:30Z', MON_0830_GMT)).toBe(
        'Offline · figures from yesterday 01:30 BST',
      );
      expect(pill('2026-10-25T01:30Z', MON_0830_GMT)).toBe(
        'Offline · figures from yesterday 01:30 GMT',
      );
    });
    it('midnight on the 25-hour day: 00:00 BST and 23:59 GMT are the same UK day', () => {
      const now = utc('2026-10-25T23:59Z'); // 23:59 GMT Sun
      expect(pill('2026-10-24T23:00Z', now)).toBe('Offline · figures from 00:00'); // 00:00 BST Sun
      expect(pill('2026-10-24T22:59Z', now)).toBe('Offline · figures from yesterday 23:59');
    });
  });
});

describe('londonDaysAgo', () => {
  it('counts UK calendar days, not 24-hour blocks', () => {
    // 23:30 BST Sat -> 00:30 GMT Mon is two UK days, 26 hours apart.
    expect(londonDaysAgo(utc('2026-10-24T22:30Z'), utc('2026-10-26T00:30Z'))).toBe(2);
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
  // Pin "now" to the same day as the fixture, or the pill adds a weekday once
  // the fixture is a day old (these tests started failing on 24 Oct 2026).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(utc('2026-10-23T07:45:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

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

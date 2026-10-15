import { describe, expect, it } from 'vitest';
import { shouldForceStaleRefresh, STALE_REFRESH_MIN_GAP_MS } from './usePeriodicRefresh';

const now = Date.parse('2026-10-15T21:00:00Z');
const lateReading = '2026-10-15T20:00:00Z'; // 60 min old: NESO is late

describe('shouldForceStaleRefresh', () => {
  it('does nothing while the reading is within its half hour (+2 min)', () => {
    expect(shouldForceStaleRefresh('2026-10-15T20:30:00Z', now, 0)).toBe(false);
  });
  it('forces a refresh when the reading is late and nothing ran recently', () => {
    expect(shouldForceStaleRefresh(lateReading, now, now - STALE_REFRESH_MIN_GAP_MS)).toBe(true);
  });
  it('does not fire again straight after a resume refresh (BH-17)', () => {
    expect(shouldForceStaleRefresh(lateReading, now, now - 600)).toBe(false);
  });
  it('does not re-request every minute while NESO is late', () => {
    expect(shouldForceStaleRefresh(lateReading, now, now - 60_000)).toBe(false);
  });
  it('ignores a missing timestamp', () => {
    expect(shouldForceStaleRefresh(null, now, 0)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { octopusKeyRejected } from './octopusKeyRejected';

describe('octopusKeyRejected (BH-127)', () => {
  it('is false with no meters or no errors', () => {
    expect(octopusKeyRejected(undefined).rejected).toBe(false);
    expect(octopusKeyRejected([{ last_sync_error: null }]).rejected).toBe(false);
  });
  it('ignores errors that are not a rejected key', () => {
    expect(octopusKeyRejected([{ last_sync_error: 'octopus_http_500' }]).rejected).toBe(false);
  });
  it('flags 401 and 403 and returns the newest time', () => {
    const r = octopusKeyRejected([
      { last_sync_error: 'octopus_http_401', last_sync_error_at: '2026-10-29T06:00:00Z' },
      { last_sync_error: 'octopus_http_403', last_sync_error_at: '2026-10-30T06:00:00Z' },
    ]);
    expect(r.rejected).toBe(true);
    expect(r.at?.toISOString()).toBe('2026-10-30T06:00:00.000Z');
  });
  it('flags a rejected key even without a time', () => {
    expect(octopusKeyRejected([{ last_sync_error: 'octopus_http_401' }])).toEqual({
      rejected: true,
      at: null,
    });
  });
});

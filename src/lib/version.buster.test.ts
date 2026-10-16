import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_VERSION, QUERY_CACHE_BUSTER } from '@/lib/version';

describe('query cache buster (BH-67)', () => {
  it('includes the app version so an update drops old cached data', () => {
    expect(QUERY_CACHE_BUSTER).toContain(`${APP_VERSION.major}.${APP_VERSION.minor}.`);
  });
  it('is wired into the query persister', () => {
    expect(readFileSync('src/App.tsx', 'utf8')).toContain('buster: QUERY_CACHE_BUSTER');
  });
});

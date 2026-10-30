import { describe, expect, it } from 'vitest';
import {
  OAUTH_INTENT_KEY,
  OAUTH_INTENT_TTL_MS,
  clearOAuthStart,
  consumeOAuthStart,
  markOAuthStart,
} from './oauthIntent';

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

describe('oauthIntent (BH-145)', () => {
  it('accepts a return shortly after a sign-in started, once', () => {
    const s = memStorage();
    markOAuthStart(s, 1000);
    expect(consumeOAuthStart(s, 1000 + 60_000)).toBe(true);
    expect(consumeOAuthStart(s, 1000 + 60_001)).toBe(false);
  });

  it('rejects when no sign-in was started on this device', () => {
    expect(consumeOAuthStart(memStorage(), 0)).toBe(false);
    expect(consumeOAuthStart(null, 0)).toBe(false);
  });

  it('rejects an expired or future-dated marker and clears it', () => {
    const s = memStorage();
    markOAuthStart(s, 0);
    expect(consumeOAuthStart(s, OAUTH_INTENT_TTL_MS + 1)).toBe(false);
    expect(s.m.has(OAUTH_INTENT_KEY)).toBe(false);
    markOAuthStart(s, 5000);
    expect(consumeOAuthStart(s, 1000)).toBe(false);
  });

  it('rejects junk markers', () => {
    const s = memStorage();
    s.setItem(OAUTH_INTENT_KEY, 'not json');
    expect(consumeOAuthStart(s, 0)).toBe(false);
    s.setItem(OAUTH_INTENT_KEY, JSON.stringify({ nonce: 'x', startedAt: 0 }));
    expect(consumeOAuthStart(s, 0)).toBe(false);
  });

  it('clearOAuthStart forgets a started sign-in', () => {
    const s = memStorage();
    markOAuthStart(s, 0);
    clearOAuthStart(s);
    expect(consumeOAuthStart(s, 1)).toBe(false);
  });
});

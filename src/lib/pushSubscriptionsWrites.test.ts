/**
 * BH-153: push_subscriptions is written only through the push-subscriptions
 * edge function. Pins that the app never writes the table directly (the
 * migration revokes INSERT/UPDATE from authenticated) and that the backstop
 * postcode CHECK agrees with the function's own rule.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeSubscriptionPostcode } from '../../supabase/functions/_shared/subscription-postcode';

const SRC = resolve(__dirname, '..');
const MIGRATION = resolve(
  __dirname,
  '../../supabase/migrations/20261029221000_push_subscriptions_writes_via_function.sql',
);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe('push_subscriptions writes (BH-153)', () => {
  it('the app never writes push_subscriptions directly', () => {
    const offenders = files(SRC).filter((f) =>
      /from\(\s*['"]push_subscriptions['"]\s*\)\s*\.\s*(insert|upsert|update)/.test(
        readFileSync(f, 'utf8').replace(/\s+/g, ' '),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('the migration revokes INSERT and UPDATE from authenticated', () => {
    const sql = readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(
      /REVOKE INSERT, UPDATE ON public\.push_subscriptions FROM authenticated, anon;/,
    );
  });

  it('the postcode CHECK accepts exactly what the edge function stores', () => {
    const sql = readFileSync(MIGRATION, 'utf8');
    const m = /postcode ~ '([^']+)'/.exec(sql);
    expect(m).not.toBeNull();
    const re = new RegExp(m![1]);
    for (const input of ['sw1a', 'SW1A 1AA', 'EH1', 'gb', 'M1', 'B33 8TH']) {
      const stored = normalizeSubscriptionPostcode(input);
      expect(stored).not.toBeNull();
      expect(stored === 'GB' || re.test(stored!)).toBe(true);
    }
    expect(re.test('SW1A 1AA')).toBe(false);
  });
});

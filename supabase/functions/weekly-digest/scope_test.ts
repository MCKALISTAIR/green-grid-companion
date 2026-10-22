import { assert, assertEquals } from 'jsr:@std/assert@1';
import { runDigest, twoUserFixture } from '../_shared/digest_test_harness.ts';

const now = new Date();
const recent = new Date(now.getTime() - 2 * 86400000).toISOString();
const later = new Date(now.getTime() + 3600000);
const forecast = [
  {
    from: later.toISOString(),
    to: new Date(later.getTime() + 1800000).toISOString(),
    intensity: { forecast: 80, actual: null, index: 'low' },
  },
];

Deno.test('weekly-digest: each subscriber only sees their own meter (BH-26)', async () => {
  const tables = twoUserFixture(recent, now.getUTCDay());
  const { status, pushes } = await runDigest(
    new URL('./index.ts', import.meta.url).href,
    tables,
    forecast,
  );
  assertEquals(status, 200);
  const alice = pushes.find((p) => p.includes('tok-alice'));
  const bob = pushes.find((p) => p.includes('tok-bob-'));
  const anon = pushes.find((p) => p.includes('tok-anon'));
  assert(alice?.includes('from 10.0kWh'), `alice got: ${alice}`);
  assert(bob?.includes('from 90.0kWh'), `bob got: ${bob}`);
  assert(!pushes.some((p) => p.includes('100.0kWh')), 'no cross-user total');
  assert(anon && !anon.includes('kWh'), `anon must not get usage numbers: ${anon}`);
});

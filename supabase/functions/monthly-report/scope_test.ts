import { assert, assertEquals } from 'jsr:@std/assert@1';
import { runDigest, twoUserFixture } from '../_shared/digest_test_harness.ts';

const now = new Date();
const lastMonthMid = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 12),
).toISOString();

Deno.test('monthly-report: each subscriber only sees their own meter (BH-26)', async () => {
  const tables = twoUserFixture(lastMonthMid, 0);
  for (const s of tables.push_subscriptions)
    (s as Record<string, unknown>).monthly_report_day = now.getUTCDate();
  const { status, pushes } = await runDigest(() => import('./index.ts'), tables, []);
  assertEquals(status, 200);
  const alice = pushes.find((p) => p.includes('tok-alice'));
  const bob = pushes.find((p) => p.includes('tok-bob-'));
  const anon = pushes.find((p) => p.includes('tok-anon'));
  assert(alice?.includes('from 10.0kWh'), `alice got: ${alice}`);
  assert(bob?.includes('from 90.0kWh'), `bob got: ${bob}`);
  assert(!pushes.some((p) => p.includes('100.0kWh')), 'no cross-user total');
  assert(anon && !anon.includes('kWh'), `anon must not get usage numbers: ${anon}`);
});

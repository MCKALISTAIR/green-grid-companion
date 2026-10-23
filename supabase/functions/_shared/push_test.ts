import { assertEquals } from 'jsr:@std/assert@1';
import { sendPushNotifications } from './push.ts';

const SECRETS = [
  'APNS_PRIVATE_KEY',
  'APNS_KEY_ID',
  'APNS_TEAM_ID',
  'FCM_PROJECT_ID',
  'FCM_CLIENT_EMAIL',
  'FCM_PRIVATE_KEY',
];

async function withNoSecrets(fn: (fetchCalls: string[]) => Promise<void>) {
  const saved = SECRETS.map((k) => [k, Deno.env.get(k)] as const);
  for (const k of SECRETS) Deno.env.delete(k);
  const realFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = ((input: string | URL | Request) => {
    calls.push(String(input));
    return Promise.reject(new Error('no network in tests'));
  }) as typeof fetch;
  try {
    await fn(calls);
  } finally {
    globalThis.fetch = realFetch;
    for (const [k, v] of saved) if (v !== undefined) Deno.env.set(k, v);
  }
}

Deno.test("missing APNs/FCM secrets: 'not_configured', never a fake success", async () => {
  await withNoSecrets(async (calls) => {
    const res = await sendPushNotifications([
      { token: 'ios-token-123456', title: 't', body: 'b', platform: 'ios', key: 'a' },
      { token: 'android-token-1234', title: 't', body: 'b', platform: 'android', key: 'b' },
    ]);
    assertEquals(res.length, 2);
    for (const r of res) {
      assertEquals(r.delivered, false);
      assertEquals(r.status, 'not_configured');
      assertEquals(r.attempts, 0);
    }
    assertEquals(
      res.map((r) => r.key),
      ['a', 'b'],
    );
    assertEquals(calls, []);
  });
});

Deno.test('callers counting delivered keys get none when not configured', async () => {
  await withNoSecrets(async () => {
    const res = await sendPushNotifications([
      { token: 'ios-token-123456', title: 't', body: 'b', key: 'alert-1' },
    ]);
    // Mirrors check-carbon-intensity: only delivered keys may save alert state.
    const deliveredKeys = new Set(res.filter((d) => d.delivered && d.key).map((d) => d.key));
    assertEquals(deliveredKeys.size, 0);
  });
});

Deno.test('empty input still returns []', async () => {
  assertEquals(await sendPushNotifications([]), []);
});

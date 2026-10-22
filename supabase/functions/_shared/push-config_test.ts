import { assertEquals } from 'jsr:@std/assert@1';
import { pushDeliveryFor } from './push-config.ts';

const env = (vars: Record<string, string>) => (name: string) => vars[name];
const APNS = { APNS_PRIVATE_KEY: 'k', APNS_KEY_ID: 'id', APNS_TEAM_ID: 'team' };
const FCM = { FCM_PROJECT_ID: 'p', FCM_CLIENT_EMAIL: 'e', FCM_PRIVATE_KEY: 'k' };

Deno.test('no secrets: every platform is not_configured', () => {
  for (const p of ['ios', 'android', 'web', undefined]) {
    assertEquals(pushDeliveryFor(p, env({})), 'not_configured');
  }
});

Deno.test('iOS needs all three APNs secrets', () => {
  assertEquals(pushDeliveryFor('ios', env(APNS)), 'configured');
  assertEquals(pushDeliveryFor('IOS', env(APNS)), 'configured');
  assertEquals(
    pushDeliveryFor('ios', env({ APNS_PRIVATE_KEY: 'k', APNS_KEY_ID: 'id' })),
    'not_configured',
  );
  // FCM alone can't deliver to an APNs device token.
  assertEquals(pushDeliveryFor('ios', env(FCM)), 'not_configured');
});

Deno.test('Android needs all three FCM secrets', () => {
  assertEquals(pushDeliveryFor('android', env(FCM)), 'configured');
  assertEquals(pushDeliveryFor('android', env(APNS)), 'not_configured');
  assertEquals(
    pushDeliveryFor('android', env({ FCM_PROJECT_ID: 'p', FCM_CLIENT_EMAIL: 'e' })),
    'not_configured',
  );
});

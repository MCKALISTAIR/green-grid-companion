import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@1';
import {
  canAccessSubscription,
  isPlausibleDeviceToken,
  ownerForUpsert,
} from './push-subscription-access.ts';

Deno.test('owner can access own row', () => {
  assert(canAccessSubscription('u1', 'u1'));
});
Deno.test('another user cannot access an owned row', () => {
  assertFalse(canAccessSubscription('u1', 'u2'));
});
Deno.test('legacy ownerless row is accessible to a signed-in caller', () => {
  assert(canAccessSubscription(null, 'u2'));
  assert(canAccessSubscription(undefined, 'u2'));
});
Deno.test('upsert always stores the caller as owner', () => {
  assertEquals(ownerForUpsert('u9'), 'u9');
});
Deno.test('device token shape', () => {
  assert(isPlausibleDeviceToken('a'.repeat(64)));
  assert(isPlausibleDeviceToken('fcm:APA91b_abc-DEF.ghi1234'));
  assertFalse(isPlausibleDeviceToken('short'));
  assertFalse(isPlausibleDeviceToken('a'.repeat(5000)));
  assertFalse(isPlausibleDeviceToken('bad token with spaces!!'));
  assertFalse(isPlausibleDeviceToken(42));
});

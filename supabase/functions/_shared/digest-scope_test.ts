import { assertEquals } from 'jsr:@std/assert@1';
import { mpansByUser, rowsForSubscriber, subscriberUserIds } from './digest-scope.ts';

const meters = [
  { user_id: 'a', mpan: 'M1' },
  { user_id: 'a', mpan: 'M2' },
  { user_id: 'b', mpan: 'M3' },
];
const rows = [{ mpan: 'M1' }, { mpan: 'M2' }, { mpan: 'M3' }, { mpan: 'ORPHAN' }];

Deno.test("rowsForSubscriber returns only that user's meters", () => {
  const by = mpansByUser(meters);
  assertEquals(
    rowsForSubscriber({ user_id: 'a' }, by, rows).map((r) => r.mpan),
    ['M1', 'M2'],
  );
  assertEquals(
    rowsForSubscriber({ user_id: 'b' }, by, rows).map((r) => r.mpan),
    ['M3'],
  );
});

Deno.test('anonymous or meterless subscribers get nothing', () => {
  const by = mpansByUser(meters);
  assertEquals(rowsForSubscriber({ user_id: null }, by, rows), []);
  assertEquals(rowsForSubscriber({ user_id: 'c' }, by, rows), []);
});

Deno.test('subscriberUserIds dedupes and drops anonymous', () => {
  assertEquals(subscriberUserIds([{ user_id: 'a' }, { user_id: 'a' }, { user_id: null }]), ['a']);
});

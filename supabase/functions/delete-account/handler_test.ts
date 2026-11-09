import { assert, assertEquals } from 'jsr:@std/assert@1';
import { handleDeleteAccount } from './handler.ts';
import { USER, fakeAdmin, fakeGetUser } from '../_shared/fake-admin_test_harness.ts';

const post = (auth?: string, body: unknown = {}) =>
  new Request('http://x/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  });

Deno.test('delete-account: 401 without an Authorization header, deletes nothing', async () => {
  const admin = fakeAdmin();
  const res = await handleDeleteAccount(post(), {
    getUser: fakeGetUser(),
    admin: () => admin.client,
  });
  assertEquals(res.status, 401);
  assertEquals(admin.queries.length, 0);
  assertEquals(admin.deletedUsers.length, 0);
});

Deno.test('delete-account: 401 for an invalid token, deletes nothing', async () => {
  const admin = fakeAdmin();
  const res = await handleDeleteAccount(post('Bearer forged'), {
    getUser: fakeGetUser(),
    admin: () => admin.client,
  });
  assertEquals(res.status, 401);
  assertEquals(admin.queries.length, 0);
  assertEquals(admin.deletedUsers.length, 0);
});

Deno.test(
  'delete-account: valid token deletes only the verified user, ignoring a body id',
  async () => {
    const admin = fakeAdmin({ octopus_meters: [{ mpan: '123' }] });
    const res = await handleDeleteAccount(
      post('Bearer good-token', { user_id: 'someone-else', userId: 'someone-else' }),
      { getUser: fakeGetUser(), admin: () => admin.client },
    );
    assertEquals(res.status, 200);
    assertEquals((await res.json()).success, true);
    assertEquals(admin.deletedUsers, [USER.id]);
    const userFilters = admin.queries.flatMap((q) =>
      q.filters.filter(([, col]) => col === 'user_id').map(([, , v]) => v),
    );
    assert(userFilters.length > 0);
    assert(userFilters.every((v) => v === USER.id));
  },
);

Deno.test('delete-account: never queries retired Tesla tables', async () => {
  const admin = fakeAdmin({ octopus_meters: [{ mpan: '123' }] });
  const res = await handleDeleteAccount(post('Bearer good-token'), {
    getUser: fakeGetUser(),
    admin: () => admin.client,
  });
  assertEquals(res.status, 200);
  assert(admin.queries.every((query) => !query.table.startsWith('tesla_')));
});

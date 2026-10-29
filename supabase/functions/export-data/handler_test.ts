import { assert, assertEquals } from 'jsr:@std/assert@1';
import { handleExportData } from './handler.ts';
import { USER, fakeAdmin, fakeGetUser } from '../_shared/fake-admin_test_harness.ts';

const post = (auth?: string, body: unknown = {}) =>
  new Request('http://x/export-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  });

Deno.test('export-data: 401 without an Authorization header, reads nothing', async () => {
  const admin = fakeAdmin();
  const res = await handleExportData(post(), { getUser: fakeGetUser(), admin: () => admin.client });
  assertEquals(res.status, 401);
  assertEquals(admin.queries.length, 0);
});

Deno.test('export-data: 401 for an invalid token, reads nothing', async () => {
  const admin = fakeAdmin();
  const res = await handleExportData(post('Bearer forged'), {
    getUser: fakeGetUser(),
    admin: () => admin.client,
  });
  assertEquals(res.status, 401);
  assertEquals(admin.queries.length, 0);
});

Deno.test(
  'export-data: valid token exports only the verified user, ignoring a body id',
  async () => {
    const admin = fakeAdmin({ octopus_meters: [{ mpan: '123' }] });
    const res = await handleExportData(post('Bearer good-token', { user_id: 'someone-else' }), {
      getUser: fakeGetUser(),
      admin: () => admin.client,
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.export_metadata.user_id, USER.id);
    const userFilters = admin.queries.flatMap((q) =>
      q.filters.filter(([, col]) => col === 'user_id').map(([, , v]) => v),
    );
    assert(userFilters.length > 0);
    assert(userFilters.every((v) => v === USER.id));
  },
);

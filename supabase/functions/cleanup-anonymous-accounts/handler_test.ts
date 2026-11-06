import { assert, assertEquals } from 'jsr:@std/assert@1';
import { handleCleanupAnonymous } from './handler.ts';
import { CRON_SECRET_HEADER } from '../_shared/cron-auth.ts';

const secret = 'c'.repeat(64);
const id = '11111111-1111-1111-1111-111111111111';
function deps(result: unknown = { dry_run: true, candidate_ids: [id] }) {
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
  return {
    calls,
    deps: {
      admin: () => ({
        rpc: (name: string, params: Record<string, unknown>) => {
          calls.push({ name, params });
          return Promise.resolve({ data: result, error: null });
        },
      }),
      getSecret: () => Promise.resolve(secret),
      env: (name: string) => (name === 'ANONYMOUS_CLEANUP_ENABLED' ? 'true' : undefined),
    },
  };
}
function post(body: unknown = {}, auth = true) {
  return new Request('http://x/cleanup-anonymous-accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { [CRON_SECRET_HEADER]: secret } : {}),
    },
    body: JSON.stringify(body),
  });
}

Deno.test(
  'anonymous cleanup: defaults to a paginated dry run without the destructive flag',
  async () => {
    const { deps: d, calls } = deps({
      dry_run: true,
      candidate_ids: [id],
      next_before_id: id,
      has_more: true,
    });
    const res = await handleCleanupAnonymous(post(), d);
    assertEquals(res.status, 200);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].params, {
      p_dry_run: true,
      p_inactive_before: null,
      p_limit: 100,
      p_before_id: '00000000-0000-0000-0000-000000000000',
      p_candidate_ids: null,
    });
    assertEquals((await res.json()).has_more, true);
  },
);

Deno.test(
  'anonymous cleanup: refuses unauthenticated calls without loading the secret',
  async () => {
    let loaded = false;
    const res = await handleCleanupAnonymous(post({}, false), {
      admin: () => {
        throw new Error('must not touch database');
      },
      getSecret: () => {
        loaded = true;
        return Promise.resolve(secret);
      },
      env: () => 'true',
    });
    assertEquals(res.status, 401);
    assert(!loaded);
  },
);

Deno.test('anonymous cleanup: execution requires exact opt-in flag', async () => {
  const { deps: d, calls } = deps();
  const res = await handleCleanupAnonymous(post({ execute: true, candidate_ids: [id] }), {
    ...d,
    env: () => '1',
  });
  assertEquals(res.status, 503);
  assertEquals(calls.length, 0);
});

Deno.test('anonymous cleanup: passes only reviewed UUIDs for a live deletion', async () => {
  const { deps: d, calls } = deps({ dry_run: false, deleted_ids: [id], deleted_count: 1 });
  const res = await handleCleanupAnonymous(post({ execute: true, candidate_ids: [id] }), d);
  assertEquals(res.status, 200);
  assertEquals(calls[0].params.p_dry_run, false);
  assertEquals(calls[0].params.p_candidate_ids, [id]);
});

for (const body of [
  { execute: 'yes' },
  { limit: 0 },
  { limit: 201 },
  { before_id: 'not-a-uuid' },
  { execute: true, candidate_ids: [] },
  { execute: true, candidate_ids: [id, id] },
]) {
  Deno.test(
    `anonymous cleanup: invalid body ${JSON.stringify(body)} is rejected safely`,
    async () => {
      const { deps: d, calls } = deps();
      const res = await handleCleanupAnonymous(post(body), d);
      assertEquals(res.status, 400);
      assertEquals(calls.length, 0);
    },
  );
}

Deno.test('anonymous cleanup: scheduler misconfiguration fails closed without an RPC', async () => {
  const { deps: d, calls } = deps();
  const res = await handleCleanupAnonymous(post(), {
    ...d,
    getSecret: () => Promise.resolve(null),
  });
  assertEquals(res.status, 503);
  assertEquals(calls.length, 0);
});

Deno.test('anonymous cleanup: an RPC error is never reported as partial success', async () => {
  const res = await handleCleanupAnonymous(post({ execute: true, candidate_ids: [id] }), {
    admin: () => ({ rpc: () => Promise.resolve({ data: null, error: { message: 'failed' } }) }),
    getSecret: () => Promise.resolve(secret),
    env: () => 'true',
  });
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: 'Cleanup failed; transaction rolled back' });
});

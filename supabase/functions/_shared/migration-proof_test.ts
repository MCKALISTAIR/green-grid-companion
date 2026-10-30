import { assertEquals } from 'jsr:@std/assert@1';
import { verifyAnonOwnership, type ProofGetUser } from './migration-proof.ts';

const ANON = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'aaa.bbb.ccc';

const getUserReturning =
  (
    user: { id: string; is_anonymous?: boolean } | null,
    error: string | null = null,
  ): ProofGetUser =>
  async () => ({ data: { user }, error: error ? { message: error } : null });

Deno.test('BH-147: a bare user id (no token) is refused', async () => {
  let called = false;
  const r = await verifyAnonOwnership(ANON, undefined, async () => {
    called = true;
    return { data: { user: null }, error: null };
  });
  assertEquals(r, { ok: false, reason: 'missing_proof' });
  assertEquals(called, false);
  assertEquals((await verifyAnonOwnership(ANON, 'not-a-jwt', getUserReturning(null))).ok, false);
});

Deno.test('BH-147: an invalid or expired token is refused', async () => {
  assertEquals(await verifyAnonOwnership(ANON, TOKEN, getUserReturning(null, 'bad jwt')), {
    ok: false,
    reason: 'invalid_proof',
  });
  assertEquals(
    await verifyAnonOwnership(ANON, TOKEN, async () => {
      throw new Error('network');
    }),
    { ok: false, reason: 'invalid_proof' },
  );
});

Deno.test("BH-147: the caller's own anon token can't claim someone else's id", async () => {
  assertEquals(
    await verifyAnonOwnership(ANON, TOKEN, getUserReturning({ id: OTHER, is_anonymous: true })),
    { ok: false, reason: 'proof_mismatch' },
  );
});

Deno.test('BH-147: a non-anonymous token is refused', async () => {
  assertEquals(
    await verifyAnonOwnership(ANON, TOKEN, getUserReturning({ id: ANON, is_anonymous: false })),
    { ok: false, reason: 'not_anonymous' },
  );
});

Deno.test('BH-147: a valid token for that anonymous user passes', async () => {
  assertEquals(
    await verifyAnonOwnership(ANON, TOKEN, getUserReturning({ id: ANON, is_anonymous: true })),
    { ok: true },
  );
});

/**
 * BH-147: migrate-data must only move data off an anonymous account the
 * caller actually held.
 *
 * Before handing off to Google/Apple sign-in the app stores the anonymous
 * session's access token next to its user id (src/lib/anonMigration.ts) and
 * sends both. We check the token with auth.getUser(): it must be valid, belong
 * to `previousUserId`, and be an anonymous user. A bare user id (all that the
 * old code needed) is no longer enough.
 */

export interface ProofUser {
  id: string;
  is_anonymous?: boolean;
}

export type ProofGetUser = (
  token: string,
) => Promise<{ data: { user: ProofUser | null }; error: { message: string } | null }>;

export type ProofResult =
  | { ok: true }
  | { ok: false; reason: 'missing_proof' | 'invalid_proof' | 'proof_mismatch' | 'not_anonymous' };

const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;

export async function verifyAnonOwnership(
  previousUserId: string,
  previousUserToken: unknown,
  getUser: ProofGetUser,
): Promise<ProofResult> {
  if (typeof previousUserToken !== 'string' || !JWT_SHAPE.test(previousUserToken)) {
    return { ok: false, reason: 'missing_proof' };
  }
  let user: ProofUser | null = null;
  try {
    const { data, error } = await getUser(previousUserToken);
    if (error) return { ok: false, reason: 'invalid_proof' };
    user = data?.user ?? null;
  } catch {
    return { ok: false, reason: 'invalid_proof' };
  }
  if (!user) return { ok: false, reason: 'invalid_proof' };
  if (user.id !== previousUserId) return { ok: false, reason: 'proof_mismatch' };
  if (user.is_anonymous !== true) return { ok: false, reason: 'not_anonymous' };
  return { ok: true };
}

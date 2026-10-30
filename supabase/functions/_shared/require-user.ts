/**
 * Verify the caller's Supabase JWT in code. Used by functions deployed with
 * verify_jwt = false (delete-account, export-data), where the gateway does not
 * check the token for us.
 *
 * The token comes only from the Authorization header ("Bearer <jwt>") and is
 * checked with supabase.auth.getUser(token). Callers must use the returned
 * user's id for all work, never an id from the request body.
 */
import { corsHeaders } from './cors.ts';

export interface AuthUser {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  app_metadata?: Record<string, unknown> & { providers?: string[] };
  identities?: Array<{ provider?: string }>;
}

export type GetUserFn = (
  token: string,
) => Promise<{ data: { user: AuthUser | null }; error: { message: string } | null }>;

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1] : null;
}

export function unauthorized(code = 'unauthorized'): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized', code }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** The signed-in user, or a 401 Response for a missing or invalid token. */
export async function requireUser(
  req: Request,
  getUser: GetUserFn,
  context: string,
): Promise<{ user: AuthUser } | { response: Response }> {
  const token = bearerToken(req);
  if (!token) return { response: unauthorized('missing_authorization') };
  try {
    const { data, error } = await getUser(token);
    if (error || !data?.user?.id) {
      console.error(`[${context}] auth rejected`, { reason: error?.message ?? 'no user' });
      return { response: unauthorized('invalid_token') };
    }
    return { user: data.user };
  } catch (e) {
    console.error(`[${context}] auth check failed`, {
      reason: e instanceof Error ? e.message : String(e),
    });
    return { response: unauthorized('invalid_token') };
  }
}

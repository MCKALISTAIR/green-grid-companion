import { corsHeaders } from '../_shared/cors.ts';
import { cronAuthErrorResponse, verifySchedulerRequest } from '../_shared/cron-auth.ts';

interface RpcResult {
  data: unknown;
  error: unknown;
}
interface RpcClient {
  rpc(name: string, params: Record<string, unknown>): PromiseLike<RpcResult>;
}
export interface Deps {
  admin: () => RpcClient;
  getSecret: () => Promise<string | null>;
  env: (name: string) => string | undefined;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
const previewParams = (body: Record<string, unknown>, execute: boolean) => ({
  p_dry_run: !execute,
  // The SQL function enforces its own 180-day floor. No request can reduce it.
  p_inactive_before: null,
  p_limit: body.limit ?? 100,
  p_before_id: body.before_id ?? '00000000-0000-0000-0000-000000000000',
  p_candidate_ids: execute ? body.candidate_ids : null,
});

export async function handleCleanupAnonymous(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const auth = await verifySchedulerRequest(req, deps.getSecret);
  if (!auth.ok) return cronAuthErrorResponse(auth, corsHeaders);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('Object required');
    body = parsed as Record<string, unknown>;
  } catch {
    body = {};
  }
  const execute = body.execute === true;
  if (body.execute !== undefined && typeof body.execute !== 'boolean')
    return json({ error: 'execute must be boolean' }, 400);
  if (
    body.limit !== undefined &&
    (!Number.isInteger(body.limit) || Number(body.limit) < 1 || Number(body.limit) > 200)
  ) {
    return json({ error: 'limit must be an integer between 1 and 200' }, 400);
  }
  if (
    body.before_id !== undefined &&
    (typeof body.before_id !== 'string' || !uuid.test(body.before_id))
  ) {
    return json({ error: 'before_id must be a UUID' }, 400);
  }
  if (execute) {
    if (deps.env('ANONYMOUS_CLEANUP_ENABLED') !== 'true') {
      return json({ error: 'Deletion is disabled; preview remains available' }, 503);
    }
    if (
      !Array.isArray(body.candidate_ids) ||
      body.candidate_ids.length < 1 ||
      body.candidate_ids.length > 200 ||
      new Set(body.candidate_ids).size !== body.candidate_ids.length ||
      body.candidate_ids.some((id) => typeof id !== 'string' || !uuid.test(id))
    ) {
      return json({ error: 'copy 1 to 200 candidate_ids from a dry-run preview' }, 400);
    }
  }
  try {
    const { data, error } = await deps
      .admin()
      .rpc('fn_cleanup_anonymous_accounts', previewParams(body, execute));
    if (error) throw error;
    return json(data);
  } catch (error) {
    console.error('Anonymous cleanup RPC failed; no partial success is reported', error);
    return json({ error: 'Cleanup failed; transaction rolled back' }, 500);
  }
}

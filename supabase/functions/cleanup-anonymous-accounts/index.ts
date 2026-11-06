import { handleCleanupAnonymous, type Deps } from './handler.ts';
import { createSchedulerSecretProvider, fetchSchedulerSecret } from '../_shared/cron-auth.ts';

async function defaultDeps(): Promise<Deps> {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Cleanup service is not configured');
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const getSecret = createSchedulerSecretProvider(() => fetchSchedulerSecret(admin));
  return { admin: () => admin, getSecret, env: (name) => Deno.env.get(name) };
}

Deno.serve(async (req) => {
  try {
    return await handleCleanupAnonymous(req, await defaultDeps());
  } catch (error) {
    console.error('Anonymous cleanup setup failed', error);
    return new Response(JSON.stringify({ error: 'Cleanup is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

import { corsHeaders } from '../_shared/cors.ts';
import { deleteOctopusUsageData, type UserDataClient } from '../_shared/user-data.ts';
import {
  isAppleUser,
  loadAppleSigninConfig,
  revokeAppleSignin,
  type AppleRevocationStatus,
} from '../_shared/apple-auth.ts';

import { requireUser, type GetUserFn } from '../_shared/require-user.ts';
export interface Deps {
  /** supabase.auth.getUser(token) on a service-role client. */
  getUser: GetUserFn;
  /** Service-role client for the user's rows. Only ever filtered by the verified user id. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: () => any;
}

/** Production dependencies. supabase-js is imported lazily so tests never load it. */
export async function defaultDeps(): Promise<Deps> {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    getUser: (token) => admin.auth.getUser(token),
    admin: () => admin,
  };
}

export async function handleDeleteAccount(req: Request, depsIn?: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const deps = depsIn ?? (await defaultDeps());
    // verify_jwt is false for this function, so the JWT is checked here (security PR).
    const auth = await requireUser(req, deps.getUser, 'delete-account');
    if ('response' in auth) return auth.response;
    const user = auth.user;

    const userId = user.id;
    console.log(`Starting account deletion for user: ${userId.substring(0, 8)}...`);

    // Optional body: { apple_authorization_code?: string, apple_client?: 'native' | 'web' }
    // The app gets a fresh code from Sign in with Apple right before deleting.
    let body: { apple_authorization_code?: unknown; apple_client?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // 1. Revoke Sign in with Apple first (App Store Guideline 5.1.1(v)). A failure is
    //    logged and reported but never blocks erasure of the user's data.
    let appleRevocation: AppleRevocationStatus = 'not_apple_user';
    if (isAppleUser(user)) {
      appleRevocation = await revokeAppleSignin({
        config: loadAppleSigninConfig((name) => Deno.env.get(name)),
        authorizationCode:
          typeof body.apple_authorization_code === 'string' ? body.apple_authorization_code : null,
        clientKind: body.apple_client === 'web' ? 'web' : 'native',
      });
      console.log(`Apple token revocation: ${appleRevocation}`);
    }

    // Use service role client for deletions
    const adminClient = deps.admin();

    // 2. Octopus readings first (keyed by MPAN, so they need the meter rows to find them),
    //    then dispatches and meters.
    const octopus = await deleteOctopusUsageData(adminClient as unknown as UserDataClient, userId);
    if (octopus.errors.length > 0) {
      console.error('Some Octopus deletions failed:', octopus.errors);
    }

    // 3. Everything else keyed by user_id
    const deletions = [
      adminClient.from('octopus_credentials').delete().eq('user_id', userId),
      // Push notification subscriptions (also cascade from auth.users, but be explicit)
      adminClient.from('push_subscriptions').delete().eq('user_id', userId),
      // User preferences
      adminClient.from('user_preferences').delete().eq('user_id', userId),
    ];

    const results = await Promise.allSettled(deletions);

    // Log any failures but continue
    const failures = results.filter(
      (r) =>
        r.status === 'rejected' ||
        (r.status === 'fulfilled' && (r.value as { error?: unknown }).error),
    );
    if (failures.length > 0) {
      console.error('Some deletions failed:', failures);
    }

    console.log(`Deleted data across ${results.length + 4} tables (${octopus.mpans} meters)`);

    // Delete the auth user account
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Failed to delete auth user:', deleteUserError.message);
      return new Response(
        JSON.stringify({
          error: "Data deleted, but we couldn't remove your sign-in. Please contact support.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Account fully deleted for user: ${userId.substring(0, 8)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your account and all its data have been deleted for good.',
        apple_revocation: appleRevocation,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Account deletion error:', error);
    return new Response(JSON.stringify({ error: 'Something went wrong deleting your account.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

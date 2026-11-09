import { corsHeaders } from '../_shared/cors.ts';

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

export async function handleExportData(req: Request, depsIn?: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const deps = depsIn ?? (await defaultDeps());
    // verify_jwt is false for this function, so the JWT is checked here (security PR).
    const auth = await requireUser(req, deps.getUser, 'export-data');
    if ('response' in auth) return auth.response;
    const user = auth.user;

    const userId = user.id;
    console.log(`Starting data export for user: ${userId.substring(0, 8)}...`);

    const adminClient = deps.admin();

    // Get user's MPANs for consumption/footprint queries
    const { data: meters } = await adminClient
      .from('octopus_meters')
      .select('*')
      .eq('user_id', userId);

    const mpans = meters?.map((m: { mpan: string }) => m.mpan) || [];

    // Fetch all user data in parallel
    const [
      credentialsResult,
      consumptionResult,
      footprintResult,
      dispatchesResult,
      preferencesResult,
      pushSubscriptionsResult,
    ] = await Promise.all([
      adminClient
        .from('octopus_credentials')
        .select('account_number, created_at, updated_at')
        .eq('user_id', userId),
      mpans.length > 0
        ? adminClient
            .from('octopus_consumption')
            .select('*')
            .in('mpan', mpans)
            .order('interval_start', { ascending: false })
        : Promise.resolve({ data: [] }),
      mpans.length > 0
        ? adminClient
            .from('carbon_footprint')
            .select('*')
            .in('mpan', mpans)
            .order('interval_start', { ascending: false })
        : Promise.resolve({ data: [] }),
      adminClient
        .from('octopus_intelligent_dispatches')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false }),
      adminClient.from('user_preferences').select('*').eq('user_id', userId),
      adminClient
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
    ]);

    const exportData = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email: user.email,
        format_version: '1.1',
        description:
          'Copy of your personal data under the UK GDPR (Articles 15 and 20: right of access and right to data portability) and the Data Protection Act 2018',
      },
      account: {
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        providers: user.app_metadata?.providers || [],
      },
      octopus_energy: {
        credentials:
          credentialsResult.data?.map((c: Record<string, unknown>) => ({
            account_number: c.account_number,
            created_at: c.created_at,
            updated_at: c.updated_at,
          })) || [],
        meters: meters || [],
        consumption_records: consumptionResult.data || [],
        carbon_footprint: footprintResult.data || [],
        intelligent_dispatches: dispatchesResult.data || [],
      },
      preferences: preferencesResult.data?.[0] || null,
      // Push notification settings for devices linked to this account. The device
      // token itself is a delivery credential, so only its last 6 characters are shown.
      push_subscriptions: (pushSubscriptionsResult.data || []).map(
        ({ device_token, ...rest }: { device_token?: string } & Record<string, unknown>) => ({
          ...rest,
          device_token_hint: device_token ? `…${String(device_token).slice(-6)}` : null,
        }),
      ),
    };

    // Count total records
    const totalRecords =
      (meters?.length || 0) +
      (consumptionResult.data?.length || 0) +
      (footprintResult.data?.length || 0) +
      (dispatchesResult.data?.length || 0) +
      (pushSubscriptionsResult.data?.length || 0);

    console.log(
      `Data export complete: ${totalRecords} records for user ${userId.substring(0, 8)}...`,
    );

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="gridsense-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Data export error:', error);
    return new Response(JSON.stringify({ error: 'Something went wrong exporting your data.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

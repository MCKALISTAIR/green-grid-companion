import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    console.log(`Starting data export for user: ${userId.substring(0, 8)}...`);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's MPANs for consumption/footprint queries
    const { data: meters } = await adminClient
      .from('octopus_meters')
      .select('*')
      .eq('user_id', userId);

    const mpans = meters?.map((m) => m.mpan) || [];

    // Fetch all user data in parallel
    const [
      credentialsResult,
      consumptionResult,
      footprintResult,
      dispatchesResult,
      teslaCredentialsResult,
      teslaVehiclesResult,
      teslaChargingResult,
      teslaEnergyDataResult,
      teslaEnergySitesResult,
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
      // Exclude sensitive tokens - only export metadata
      adminClient
        .from('tesla_credentials')
        .select('created_at, updated_at, token_expires_at')
        .eq('user_id', userId),
      adminClient.from('tesla_vehicles').select('*').eq('user_id', userId),
      adminClient
        .from('tesla_charging_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false }),
      adminClient
        .from('tesla_energy_data')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false }),
      adminClient.from('tesla_energy_sites').select('*').eq('user_id', userId),
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
        format_version: '1.0',
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
          credentialsResult.data?.map((c) => ({
            account_number: c.account_number,
            created_at: c.created_at,
            updated_at: c.updated_at,
          })) || [],
        meters: meters || [],
        consumption_records: consumptionResult.data || [],
        carbon_footprint: footprintResult.data || [],
        intelligent_dispatches: dispatchesResult.data || [],
      },
      tesla: {
        credentials:
          teslaCredentialsResult.data?.map((c) => ({
            created_at: c.created_at,
            updated_at: c.updated_at,
            token_expires_at: c.token_expires_at,
          })) || [],
        vehicles: teslaVehiclesResult.data || [],
        charging_sessions: teslaChargingResult.data || [],
        energy_data: teslaEnergyDataResult.data || [],
        energy_sites: teslaEnergySitesResult.data || [],
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
      (teslaVehiclesResult.data?.length || 0) +
      (teslaChargingResult.data?.length || 0) +
      (teslaEnergyDataResult.data?.length || 0) +
      (teslaEnergySitesResult.data?.length || 0) +
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
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred during data export.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Hack to make VS Code happy with Deno globals in a Node workspace
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OctopusConsumption {
  consumption: number;
  interval_start: string;
  interval_end: string;
}

interface OctopusMeterPoint {
  mpan?: string;
  mprn?: string;
  meters: { serial_number: string }[];
}

interface OctopusProperty {
  electricity_meter_points?: OctopusMeterPoint[];
  gas_meter_points?: OctopusMeterPoint[];
}

interface FootprintRecord {
  interval_start: string;
  interval_end: string;
  consumption_kwh: number;
  intensity_gco2_kwh: number;
  carbon_g: number;
  intensity_index: string;
  mpan: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create a Supabase client with the Auth context of the logged in user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the user's JWT to create a scoped client (or use service role and get user manually)
    // We'll use service role to allow access to the credentials table (which might be protected/private),
    // but we MUST validate the user first.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate User
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse action and params
    let action: string | null = null;
    let days: number = 7;
    let payload: any = {};

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      action = body.action || null;
      days = parseInt(body.days) || 7;
      payload = body;
    } else {
      const url = new URL(req.url);
      action = url.searchParams.get('action');
      days = parseInt(url.searchParams.get('days') || '7');
    }

    console.log(`Octopus Energy API - Action: ${action}, Days: ${days}, User: ${userId}`);

    // --- CREDENTIALS MANAGEMENT ---

    if (action === 'save-credentials') {
      const { apiKey, accountNumber } = payload;
      if (!apiKey || !accountNumber) {
        return new Response(
          JSON.stringify({ error: 'Missing API Key or Account Number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upsert credentials
      const { error } = await supabase
        .from('octopus_credentials')
        .upsert({
          user_id: userId,
          api_key: apiKey,
          account_number: accountNumber,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving credentials:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to save credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect-account') {
      const { error: credsError } = await supabase
        .from('octopus_credentials')
        .delete()
        .eq('user_id', userId);

      if (credsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase.from('octopus_meters').delete().eq('user_id', userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to get credentials
    async function getUserCredentials() {
      const { data, error } = await supabase
        .from('octopus_credentials')
        .select('api_key, account_number')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }
      return data;
    }

    if (action === 'check-credentials') {
      const creds = await getUserCredentials();
      return new Response(
        JSON.stringify({ has_credentials: !!creds }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- REQUIRES CREDENTIALS ---

    // For all other actions, we need credentials
    const credentials = await getUserCredentials();

    // Allow get-status to run even without credentials (it will return unlinked state)
    // But other actions should fail if no credentials
    if (!credentials && action !== 'get-status' && action !== 'get-greenness-forecast') {
      return new Response(
        JSON.stringify({ error: 'Octopus Energy credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { api_key: OCTOPUS_API_KEY, account_number: OCTOPUS_ACCOUNT_NUMBER } = credentials || {};
    const authHeaderOctopus = OCTOPUS_API_KEY ? 'Basic ' + btoa(OCTOPUS_API_KEY + ':') : null;

    if (action === 'get-meters') {
      if (!authHeaderOctopus || !OCTOPUS_ACCOUNT_NUMBER) throw new Error('Missing credentials');

      // Fetch account details to get meter information
      const accountUrl = `https://api.octopus.energy/v1/accounts/${OCTOPUS_ACCOUNT_NUMBER}/`;
      console.log(`Fetching account from: ${accountUrl}`);

      const response = await fetch(accountUrl, {
        headers: { 'Authorization': authHeaderOctopus }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Octopus API error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ error: `Failed to fetch account: ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const accountData = await response.json();

      // Extract electricity meters
      const meters: { mpan: string; serial_number: string }[] = [];

      for (const property of accountData.properties || []) {
        for (const meterPoint of property.electricity_meter_points || []) {
          for (const meter of meterPoint.meters || []) {
            if (meterPoint.mpan && meter.serial_number) {
              meters.push({
                mpan: meterPoint.mpan,
                serial_number: meter.serial_number
              });
            }
          }
        }
      }

      console.log(`Found ${meters.length} electricity meters for user ${userId}`);

      // Store meters in database linked to user
      for (const meter of meters) {
        const { error } = await supabase
          .from('octopus_meters')
          .upsert({
            user_id: userId, // Link to user
            mpan: meter.mpan,
            serial_number: meter.serial_number,
            is_active: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'mpan' }); // Assumes MPAN is unique system-wide, which is true. 
        // If user A claims it, User B can't claim same MPAN unless we change constraint.
        // For now, MPAN is globally unique so this is fine.

        if (error) {
          console.error(`Error storing meter ${meter.mpan}:`, error);
        }
      }

      return new Response(
        JSON.stringify({ meters }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sync-consumption') {
      if (!authHeaderOctopus) throw new Error('Missing credentials');

      // Get meter details for THIS user
      const { data: meterData, error: meterError } = await supabase
        .from('octopus_meters')
        .select('*')
        .eq('user_id', userId) // Enforce user ownership
        .eq('is_active', true)
        .limit(1)
        .single();

      if (meterError || !meterData) {
        console.error('No active meter found for user:', meterError);
        return new Response(
          JSON.stringify({ error: 'No linked meter found. Please link your meter first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { mpan, serial_number } = meterData;

      // Calculate date range
      const daysBack = days;
      const periodTo = new Date();
      const periodFrom = new Date();
      periodFrom.setDate(periodFrom.getDate() - daysBack);

      const consumptionUrl = `https://api.octopus.energy/v1/electricity-meter-points/${mpan}/meters/${serial_number}/consumption/?period_from=${periodFrom.toISOString()}&period_to=${periodTo.toISOString()}&page_size=25000`;

      console.log(`Fetching consumption for ${mpan}`);

      const response = await fetch(consumptionUrl, {
        headers: { 'Authorization': authHeaderOctopus }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Octopus API error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ error: `Failed to fetch consumption: ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const consumptionData = await response.json();
      const readings: OctopusConsumption[] = consumptionData.results || [];

      console.log(`Received ${readings.length} consumption readings`);

      // Store consumption data
      let insertedCount = 0;
      for (const reading of readings) {
        const { error } = await supabase
          .from('octopus_consumption')
          .upsert({
            interval_start: reading.interval_start,
            interval_end: reading.interval_end,
            consumption_kwh: reading.consumption,
            mpan,
            serial_number
          }, { onConflict: 'mpan,interval_start' });

        if (!error) insertedCount++;
      }

      // Update last sync time
      await supabase
        .from('octopus_meters')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('mpan', mpan)
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({
          success: true,
          readings_synced: insertedCount,
          period_from: periodFrom.toISOString(),
          period_to: periodTo.toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to map MPAN Area Code (first 2 digits) to NESO Carbon Region ID
    function getRegionIdFromMpan(mpan: string): number | null {
      if (!mpan || mpan.length < 2) return null;
      const areaCode = mpan.substring(0, 2);
      const mapping: Record<string, number> = {
        '10': 10, '11': 9, '12': 13, '13': 6, '14': 8, '15': 4, '16': 3,
        '17': 2, '18': 1, '19': 12, '20': 11, '21': 7, '22': 14, '23': 5,
      };
      return mapping[areaCode] || null;
    }

    if (action === 'calculate-footprint') {

      // Find user's MPAN first to get the correct consumption data
      const { data: userMeter } = await supabase
        .from('octopus_meters')
        .select('mpan')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!userMeter) {
        return new Response(
          JSON.stringify({ error: 'No meter linked' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get consumption data for this user's MPAN
      const { data: consumption, error: consumptionError } = await supabase
        .from('octopus_consumption')
        .select('*')
        .eq('mpan', userMeter.mpan)
        .order('interval_start', { ascending: false })
        .limit(500);

      if (consumptionError || !consumption?.length) {
        return new Response(
          JSON.stringify({ error: 'No consumption data found. Please sync consumption first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Determine Date Range
      const timestamps = consumption.map((r: any) => new Date(r.interval_start).getTime());
      const minTime = new Date(Math.min(...timestamps));
      const maxTime = new Date(Math.max(...timestamps));

      const fromStr = minTime.toISOString();
      const toStr = maxTime.toISOString();

      // 2. Determine Region
      const mpan = consumption[0].mpan;
      const regionId = getRegionIdFromMpan(mpan);

      let intensityUrl = `https://api.carbonintensity.org.uk/intensity/${fromStr}/${toStr}`;
      let isRegional = false;

      if (regionId) {
        intensityUrl = `https://api.carbonintensity.org.uk/regional/intensity/${fromStr}/${toStr}/regionid/${regionId}`;
        isRegional = true;
      }

      let intensityMap = new Map<string, { intensity: number, index: string }>();

      try {
        const intensityResponse = await fetch(intensityUrl);
        if (!intensityResponse.ok) throw new Error(`Failed to fetch batch intensity: ${intensityResponse.status}`);

        const intensityJson = await intensityResponse.json();
        let intensityList: any[] = [];

        if (isRegional) {
          // Check nested structure carefully
          if (Array.isArray(intensityJson.data)) {
            // Sometimes regional API returns array of regions, we want the first (and only) one if we requested by ID
            intensityList = intensityJson.data[0]?.data || [];
          } else {
            // Or direct object
            intensityList = intensityJson.data?.data || [];
          }
        } else {
          intensityList = intensityJson.data || [];
        }

        for (const item of intensityList) {
          if (item.from && item.intensity) {
            const value = item.intensity.actual ?? item.intensity.forecast ?? 0;
            const index = item.intensity.index || 'moderate';
            intensityMap.set(item.from, { intensity: value, index });
          }
        }

      } catch (error) {
        console.error('Batch fetch failed:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch external carbon data' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Process records
      let calculatedCount = 0;
      const footprintRecords: FootprintRecord[] = [];

      for (const record of consumption) {
        const data = intensityMap.get(record.interval_start);

        if (data) {
          const carbonG = record.consumption_kwh * data.intensity;

          footprintRecords.push({
            interval_start: record.interval_start,
            interval_end: record.interval_end,
            consumption_kwh: record.consumption_kwh,
            intensity_gco2_kwh: data.intensity,
            carbon_g: carbonG,
            intensity_index: data.index,
            mpan: record.mpan
          });
        }
      }

      // 4. Batch Insert
      if (footprintRecords.length > 0) {
        const { error } = await supabase
          .from('carbon_footprint')
          .upsert(footprintRecords, { onConflict: 'mpan,interval_start' });

        if (!error) calculatedCount = footprintRecords.length;
      }

      return new Response(
        JSON.stringify({
          success: true,
          records_calculated: calculatedCount,
          region_used: isRegional ? regionId : 'national'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-footprint') {
      const { data: userMeter } = await supabase
        .from('octopus_meters')
        .select('mpan')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!userMeter) {
        return new Response(
          JSON.stringify({ records: [], summary: {} }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const periodFrom = new Date();
      periodFrom.setDate(periodFrom.getDate() - days);

      const { data: footprint, error } = await supabase
        .from('carbon_footprint')
        .select('*')
        .eq('mpan', userMeter.mpan)
        .gte('interval_start', periodFrom.toISOString())
        .order('interval_start', { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch footprint data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate summary stats
      const totalCarbonG = footprint?.reduce((sum: number, r: FootprintRecord) => sum + Number(r.carbon_g), 0) || 0;
      const totalKwh = footprint?.reduce((sum: number, r: FootprintRecord) => sum + Number(r.consumption_kwh), 0) || 0;
      const avgIntensity = footprint?.length
        ? footprint.reduce((sum: number, r: FootprintRecord) => sum + r.intensity_gco2_kwh, 0) / footprint.length
        : 0;

      const byIndex: Record<string, { count: number; carbon_g: number; kwh: number }> = {};
      for (const record of footprint || []) {
        const idx = record.intensity_index;
        if (!byIndex[idx]) byIndex[idx] = { count: 0, carbon_g: 0, kwh: 0 };
        byIndex[idx].count++;
        byIndex[idx].carbon_g += Number(record.carbon_g);
        byIndex[idx].kwh += Number(record.consumption_kwh);
      }

      return new Response(
        JSON.stringify({
          records: footprint,
          summary: {
            total_carbon_kg: totalCarbonG / 1000,
            total_kwh: totalKwh,
            avg_intensity: Math.round(avgIntensity),
            by_intensity_index: byIndex,
            period_days: days
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-greenness-forecast') {
      const query = `
        query GreennessForecast {
          greennessForecast {
            validFrom
            validTo
            greennessScore
            greennessIndex
            highlightFlag
          }
        }
      `;

      try {
        const response = await fetch('https://api.octopus.energy/v1/graphql/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, operationName: 'GreennessForecast' })
        });

        if (!response.ok) throw new Error(`GraphQL Error: ${response.status}`);
        const result = await response.json();
        if (result.errors) throw new Error(result.errors[0]?.message || 'GraphQL Query Error');

        return new Response(
          JSON.stringify({ forecast: result.data?.greennessForecast || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
          JSON.stringify({ error: message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'get-status') {
      // Get meter status for current user
      const { data: meters } = await supabase
        .from('octopus_meters')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      // Get latest consumption
      let latestConsumption = null;
      let footprintCount = 0;

      if (meters && meters.length > 0) {
        // Assuming single meter for simplicity in status check, or check all
        const mpans = meters.map(m => m.mpan);

        const { data: latest } = await supabase
          .from('octopus_consumption')
          .select('interval_start')
          .in('mpan', mpans)
          .order('interval_start', { ascending: false })
          .limit(1);

        latestConsumption = latest?.[0]?.interval_start || null;

        const { count } = await supabase
          .from('carbon_footprint')
          .select('*', { count: 'exact', head: true })
          .in('mpan', mpans);

        footprintCount = count || 0;
      }

      return new Response(
        JSON.stringify({
          is_linked: meters && meters.length > 0,
          has_credentials: !!credentials,
          meters: meters || [],
          latest_consumption: latestConsumption,
          footprint_records: footprintCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Octopus Energy function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

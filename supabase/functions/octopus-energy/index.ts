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

interface IntensityData {
  from: string;
  to: string;
  intensity: {
    forecast: number;
    actual: number | null;
    index: string;
  };
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
    const OCTOPUS_API_KEY = Deno.env.get('OCTOPUS_API_KEY');
    const OCTOPUS_ACCOUNT_NUMBER = Deno.env.get('OCTOPUS_ACCOUNT_NUMBER');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!OCTOPUS_API_KEY || !OCTOPUS_ACCOUNT_NUMBER) {
      console.error('Missing Octopus credentials');
      return new Response(
        JSON.stringify({ error: 'Octopus Energy credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse action and params from request body (POST) or query params (GET)
    let action: string | null = null;
    let days: number = 7;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      action = body.action || null;
      days = parseInt(body.days) || 7;
    } else {
      const url = new URL(req.url);
      action = url.searchParams.get('action');
      days = parseInt(url.searchParams.get('days') || '7');
    }

    console.log(`Octopus Energy API - Action: ${action}, Days: ${days}`);

    // Basic auth header for Octopus API
    const authHeader = 'Basic ' + btoa(OCTOPUS_API_KEY + ':');

    if (action === 'get-meters') {
      // Fetch account details to get meter information
      const accountUrl = `https://api.octopus.energy/v1/accounts/${OCTOPUS_ACCOUNT_NUMBER}/`;
      console.log(`Fetching account from: ${accountUrl}`);

      const response = await fetch(accountUrl, {
        headers: { 'Authorization': authHeader }
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
      console.log('Account data received:', JSON.stringify(accountData, null, 2));

      // Extract electricity meters from all properties
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

      console.log(`Found ${meters.length} electricity meters`);

      // Store meters in database
      for (const meter of meters) {
        const { error } = await supabase
          .from('octopus_meters')
          .upsert({
            mpan: meter.mpan,
            serial_number: meter.serial_number,
            is_active: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'mpan' });

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
      // Get meter details from database
      const { data: meterData, error: meterError } = await supabase
        .from('octopus_meters')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (meterError || !meterData) {
        console.error('No active meter found:', meterError);
        return new Response(
          JSON.stringify({ error: 'No linked meter found. Please link your meter first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { mpan, serial_number } = meterData;

      // Calculate date range using days from request body
      const daysBack = days;
      const periodTo = new Date();
      const periodFrom = new Date();
      periodFrom.setDate(periodFrom.getDate() - daysBack);

      const consumptionUrl = `https://api.octopus.energy/v1/electricity-meter-points/${mpan}/meters/${serial_number}/consumption/?period_from=${periodFrom.toISOString()}&period_to=${periodTo.toISOString()}&page_size=25000`;

      console.log(`Fetching consumption from: ${consumptionUrl}`);

      const response = await fetch(consumptionUrl, {
        headers: { 'Authorization': authHeader }
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
        .eq('mpan', mpan);

      console.log(`Stored ${insertedCount} consumption readings`);

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

      // Mapping based on GSP Group Area Codes
      const mapping: Record<string, number> = {
        '10': 10, // Eastern
        '11': 9,  // East Midlands
        '12': 13, // London
        '13': 6,  // MANWEB (N. Wales & Merseyside)
        '14': 8,  // West Midlands
        '15': 4,  // North East
        '16': 3,  // North West
        '17': 2,  // North Scotland
        '18': 1,  // South Scotland
        '19': 12, // South East
        '20': 11, // Southern
        '21': 7,  // South Wales
        '22': 14, // South West
        '23': 5,  // Yorkshire
      };

      return mapping[areaCode] || null;
    }

    if (action === 'calculate-footprint') {
      // Get consumption data
      const { data: consumption, error: consumptionError } = await supabase
        .from('octopus_consumption')
        .select('*')
        .order('interval_start', { ascending: false })
        .limit(500);

      if (consumptionError || !consumption?.length) {
        console.error('No consumption data found:', consumptionError);
        return new Response(
          JSON.stringify({ error: 'No consumption data found. Please sync consumption first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Processing ${consumption.length} consumption records for footprint`);

      // 1. Determine Date Range
      const timestamps = consumption.map((r: any) => new Date(r.interval_start).getTime());
      const minTime = new Date(Math.min(...timestamps));
      const maxTime = new Date(Math.max(...timestamps));

      const fromStr = minTime.toISOString();
      const toStr = maxTime.toISOString();

      // 2. Determine Region from MPAN (use first record's MPAN)
      // MPAN is string in DB
      const mpan = consumption[0].mpan;
      const regionId = getRegionIdFromMpan(mpan);

      let intensityUrl = `https://api.carbonintensity.org.uk/intensity/${fromStr}/${toStr}`;
      let isRegional = false;

      if (regionId) {
        console.log(`Detected Region ID ${regionId} from MPAN ${mpan}. Using Regional Accuracy.`);
        intensityUrl = `https://api.carbonintensity.org.uk/regional/intensity/${fromStr}/${toStr}/regionid/${regionId}`;
        isRegional = true;
      } else {
        console.log(`Could not detect region from MPAN ${mpan}. Falling back to National Average.`);
      }

      console.log(`Fetching batch intensity from: ${intensityUrl}`);

      let intensityMap = new Map<string, { intensity: number, index: string }>();

      try {
        const intensityResponse = await fetch(intensityUrl);
        if (!intensityResponse.ok) {
          const dryRunText = await intensityResponse.text();
          console.error(`Intensity Batch Error ${intensityResponse.status}: ${dryRunText}`);
          throw new Error(`Failed to fetch batch intensity: ${intensityResponse.status}`);
        }

        const intensityJson = await intensityResponse.json();

        // Parse Logic: National vs Regional structure is different
        let intensityList: any[] = [];

        if (isRegional) {
          // Regional response: { data: { data: [...] } }
          if (Array.isArray(intensityJson.data)) {
            intensityList = intensityJson.data[0]?.data || [];
          } else {
            intensityList = intensityJson.data?.data || [];
          }
        } else {
          // National: { data: [...] }
          intensityList = intensityJson.data || [];
        }

        console.log(`Received ${intensityList.length} intensity records (Regional: ${isRegional})`);

        for (const item of intensityList) {
          if (item.from && item.intensity) {
            // Regional often only has 'forecast', no 'actual'. Use logic: actual ?? forecast
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
        // Upsert 
        const { error } = await supabase
          .from('carbon_footprint')
          .upsert(footprintRecords, { onConflict: 'mpan,interval_start' });

        if (!error) {
          calculatedCount = footprintRecords.length;
        } else {
          console.error('Upsert check error:', error);
        }
      }

      console.log(`Calculated footprint for ${calculatedCount} records`);

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
      const periodFrom = new Date();
      periodFrom.setDate(periodFrom.getDate() - days);

      const { data: footprint, error } = await supabase
        .from('carbon_footprint')
        .select('*')
        .gte('interval_start', periodFrom.toISOString())
        .order('interval_start', { ascending: true });

      if (error) {
        console.error('Error fetching footprint:', error);
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

      // Count by intensity level
      const byIndex: Record<string, { count: number; carbon_g: number; kwh: number }> = {};
      for (const record of footprint || []) {
        const idx = record.intensity_index;
        if (!byIndex[idx]) {
          byIndex[idx] = { count: 0, carbon_g: 0, kwh: 0 };
        }
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
          headers: {
            'Content-Type': 'application/json',
            // GraphQL endpoint is public, but good practice to include auth if we have it, 
            // though the docs say it's public for this specific query.
          },
          body: JSON.stringify({ query, operationName: 'GreennessForecast' })
        });

        if (!response.ok) {
          throw new Error(`GraphQL Error: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message || 'GraphQL Query Error');
        }

        return new Response(
          JSON.stringify({
            forecast: result.data?.greennessForecast || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: unknown) {
        console.error('GraphQL Fetch Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
          JSON.stringify({ error: message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'get-status') {
      // Get meter status
      const { data: meters } = await supabase
        .from('octopus_meters')
        .select('*')
        .eq('is_active', true);

      // Get latest consumption
      const { data: latestConsumption } = await supabase
        .from('octopus_consumption')
        .select('interval_start')
        .order('interval_start', { ascending: false })
        .limit(1);

      // Get footprint count
      const { count: footprintCount } = await supabase
        .from('carbon_footprint')
        .select('*', { count: 'exact', head: true });

      return new Response(
        JSON.stringify({
          is_linked: meters && meters.length > 0,
          meters: meters || [],
          latest_consumption: latestConsumption?.[0]?.interval_start || null,
          footprint_records: footprintCount || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: get-meters, sync-consumption, calculate-footprint, get-footprint, get-status' }),
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

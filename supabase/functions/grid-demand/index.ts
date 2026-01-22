// @ts-ignore: Suppress Deno namespace error if not in Deno context
const _ignore = null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IntensityResponse {
  data: {
    generationmix: {
      fuel: string;
      perc: number;
    }[];
  };
}

interface NesoResponse {
  result: {
    records: {
      SETTLEMENT_DATE: string;
      SETTLEMENT_PERIOD: number;
      TSD: number; // Transmission System Demand
      ND: number; // National Demand
      ENGLAND_WALES_DEMAND: number;
      EMBEDDED_WIND_GENERATION: number;
      EMBEDDED_SOLAR_GENERATION: number;
    }[];
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Fetching grid demand data...');

    // 1. Fetch Generation Mix % from Carbon Intensity API
    const mixPromise = fetch('https://api.carbonintensity.org.uk/generation', {
      headers: { 'Accept': 'application/json' }
    }).then(res => res.json() as Promise<IntensityResponse>);

    // 2. Fetch Demand from NESO Data Portal (SQL search for latest record)
    // Resource ID for "Historic Demand Data 2025": b2bde559-3455-4021-b179-dfe60c0337b0
    // We sort by _id desc to get the latest inserted row, or we could sort by date
    const resourceId = 'b2bde559-3455-4021-b179-dfe60c0337b0';
    const nesoUrl = `https://api.neso.energy/api/3/action/datastore_search_sql?sql=SELECT * from "${resourceId}" ORDER BY "_id" DESC LIMIT 1`;

    const demandPromise = fetch(nesoUrl).then(res => res.json() as Promise<NesoResponse>);

    // 3. Fetch Frequency (Using Dec 2025 Resource ID as fallback for current month)
    // TODO: Update this ID dynamically or via cron to match the current month's resource ID
    const frequencyResourceId = '5c408627-44a1-417d-9fc5-a26ad822c4e4';
    const frequencyUrl = `https://api.neso.energy/api/3/action/datastore_search_sql?sql=SELECT * from "${frequencyResourceId}" ORDER BY "_id" DESC LIMIT 1`;
    const frequencyPromise = fetch(frequencyUrl).then(res => res.json() as Promise<any>);

    // Use Promise.allSettled so one failure doesn't block the other
    const [mixResult, demandResult, freqResult] = await Promise.allSettled([mixPromise, demandPromise, frequencyPromise]);

    let mixData: IntensityResponse | null = null;
    let demandData: NesoResponse | null = null;
    let frequencyData: any = null;

    if (mixResult.status === 'fulfilled') {
      mixData = mixResult.value;
    } else {
      console.error('Failed to fetch generation mix:', mixResult.reason);
    }

    if (demandResult.status === 'fulfilled') {
      demandData = demandResult.value;
    } else {
      console.warn('Failed to fetch demand data:', demandResult.reason);
    }

    if (freqResult.status === 'fulfilled') {
      frequencyData = freqResult.value;
    } else {
      console.warn('Failed to fetch frequency data:', freqResult.reason);
    }

    // Validation - We need at least the mix to show something useful
    if (!mixData?.data?.generationmix) {
      throw new Error('Failed to fetch generation mix');
    }

    const latestDemand = demandData?.result?.records?.[0];
    const latestFreq = frequencyData?.result?.records?.[0];

    // Use Transmission System Demand (TSD) or National Demand (ND). 
    // ND is usually what's referred to as "Demand" on the dashboard.
    // However, Embedded Wind/Solar is heavily relevant for Carbon Intensity.
    // The Carbon Intensity API usually refers to "GB Demand".
    // We will use ND (National Demand) as the headline figure for now.
    const totalDemandMW = latestDemand?.ND ?? null;
    const gridFrequency = latestFreq?.value ?? null; // Field usually named 'value' or 'frequency'

    // Calculate MW for each source based on percentage
    // Note: The percentages from carbonintensity.org.uk might slightly disagree with NESO MWs if timestamps drift,
    // but it's the best approximation we have without a raw MW feed for everything.
    const mixMW = mixData.data.generationmix.map(source => ({
      id: source.fuel,
      name: source.fuel,
      perc: source.perc,
      mw: totalDemandMW !== null ? Math.round(totalDemandMW * (source.perc / 100)) : null
    }));

    // Sort by percentage descending if MW is not available, otherwise MW
    mixMW.sort((a, b) => {
      if (a.mw !== null && b.mw !== null) {
        return b.mw - a.mw;
      }
      return b.perc - a.perc;
    });

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        settlementDate: latestDemand?.SETTLEMENT_DATE ?? null,
        settlementPeriod: latestDemand?.SETTLEMENT_PERIOD ?? null,
        totalDemandMW: totalDemandMW,
        gridFrequency: gridFrequency,
        mix: mixMW
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

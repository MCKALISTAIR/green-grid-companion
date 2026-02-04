// @ts-ignore: Suppress Deno namespace error if not in Deno context
const _ignore = null;

declare const Deno: any;

export const corsHeaders = {
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

    // 3. Fetch Frequency dynamically by finding the current month's resource in the Historic Frequency Data package
    // NESO organizes frequency data in a single package (cb1cc925-ecd8-4406-b021-3a3f368196e1) with monthly resources
    // Resource names follow format: "February 2026 – Historic Frequency Data"
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const frequencyPromise = (async () => {
      try {
        // The Historic Frequency Data package ID is stable
        const packageId = 'cb1cc925-ecd8-4406-b021-3a3f368196e1';
        const packageUrl = `https://api.neso.energy/api/3/action/package_show?id=${packageId}`;
        
        console.log('Fetching frequency package metadata...');
        const packageRes = await fetch(packageUrl);
        const packageData = await packageRes.json();
        
        if (!packageData?.result?.resources?.length) {
          console.warn('No resources found in frequency package');
          return null;
        }
        
        const resources = packageData.result.resources;
        
        // Try to find current month's resource first
        const currentMonth = monthNames[now.getUTCMonth()];
        const currentYear = now.getUTCFullYear();
        const currentMonthPattern = `${currentMonth} ${currentYear}`;
        
        let targetResource = resources.find((r: any) => 
          r.name?.includes(currentMonthPattern) && r.datastore_active
        );
        
        // If not found, try previous month (data might not be uploaded yet early in the month)
        if (!targetResource) {
          const prevMonthIndex = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
          const prevYear = now.getUTCMonth() === 0 ? currentYear - 1 : currentYear;
          const prevMonthPattern = `${monthNames[prevMonthIndex]} ${prevYear}`;
          
          console.log(`Current month "${currentMonthPattern}" not found, trying "${prevMonthPattern}"`);
          targetResource = resources.find((r: any) => 
            r.name?.includes(prevMonthPattern) && r.datastore_active
          );
        }
        
        // Still not found? Use the most recently created resource with datastore_active
        if (!targetResource) {
          console.log('Month-specific resource not found, using most recent available');
          const activeResources = resources
            .filter((r: any) => r.datastore_active)
            .sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
          targetResource = activeResources[0];
        }
        
        if (!targetResource?.id) {
          console.warn('No suitable frequency resource found');
          return null;
        }
        
        console.log(`Using frequency resource: ${targetResource.name} (${targetResource.id})`);
        
        const frequencyUrl = `https://api.neso.energy/api/3/action/datastore_search_sql?sql=SELECT * from "${targetResource.id}" ORDER BY "_id" DESC LIMIT 1`;
        const freqRes = await fetch(frequencyUrl);
        return freqRes.json();
      } catch (err) {
        console.error('Error fetching frequency data:', err);
        return null;
      }
    })();

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
    const gridFrequency = latestFreq?.f ?? latestFreq?.value ?? null; // Field is 'f' in NESO frequency data

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

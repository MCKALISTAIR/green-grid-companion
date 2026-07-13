// Deno context wrapper
const _ignore = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

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

  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimit = await checkRateLimit(clientIP, 30, 60); // 30 req/min

  if (!rateLimit.allowed) {
    console.warn(`[RATE LIMIT] Blocked request from IP ${clientIP}. Retry after ${rateLimit.retryAfter}s`);
    return new Response(
      JSON.stringify({ error: 'Too many requests', retryAfter: rateLimit.retryAfter }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfter),
        },
      }
    );
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

    // 3. Fetch real-time frequency from Elexon Insights Solution REST API (public, no key required)
    const frequencyPromise = (async () => {
      try {
        console.log('Fetching real-time frequency from Elexon...');
        const freqRes = await fetch('https://data.elexon.co.uk/bmrs/api/v1/system/frequency');

        if (!freqRes.ok) {
          console.warn(`Real-time frequency request failed: ${freqRes.status}`);
          return null;
        }

        const data = await freqRes.json();
        if (Array.isArray(data) && data.length > 0) {
          // Sort by measurementTime descending to find the latest
          const sorted = [...data].sort((a: any, b: any) => 
            new Date(b.measurementTime).getTime() - new Date(a.measurementTime).getTime()
          );
          const latest = sorted[0];
          const frequency = latest.frequency;
          console.log(`Real-time frequency: ${frequency} Hz (measured at ${latest.measurementTime})`);
          return { frequency };
        }

        console.warn('Could not parse frequency from Elexon API: empty or invalid array');
        return null;
      } catch (err) {
        console.error('Error fetching real-time frequency from Elexon:', err);
        return null;
      }
    })();

    // Use Promise.allSettled so one failure doesn't block the other
    const [mixResult, demandResult, freqResult] = await Promise.allSettled([mixPromise, demandPromise, frequencyPromise]);

    let mixData: IntensityResponse | null = null;
    let demandData: NesoResponse | null = null;
    let frequencyData: { frequency: number } | null = null;

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

    // Use National Demand (ND) as the headline figure
    const totalDemandMW = latestDemand?.ND ?? null;

    // Extract frequency from the real-time data (new format: { frequency: number })
    const gridFrequency = frequencyData?.frequency ?? null;

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
        embeddedSolarMW: latestDemand?.EMBEDDED_SOLAR_GENERATION ?? null,
        embeddedWindMW: latestDemand?.EMBEDDED_WIND_GENERATION ?? null,
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

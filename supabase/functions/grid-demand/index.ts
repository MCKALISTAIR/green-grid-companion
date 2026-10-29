// Deno context wrapper
const _ignore = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

import { corsHeaders } from '../_shared/cors.ts';
import { safeErrorResponse } from '../_shared/safe-error.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import {
  buildGridDemand,
  embeddedForecastUrl,
  frequencyUrl,
  fuelinstUrl,
} from '../_shared/grid-demand.ts';

/**
 * Live GB generation mix in MW.
 *
 * Sources and rules are documented in ../_shared/grid-demand.ts:
 * - Elexon BMRS FUELINST (5-min metered transmission generation + interconnectors)
 * - NESO Embedded Solar and Wind Forecast (current half hour; embedded output is not metered live)
 * - Elexon BMRS FREQ (system frequency)
 * All keyless. Figures older than the thresholds there are refused and the
 * response says status "unavailable" instead of returning old or estimated
 * totals. (This used to read NESO "Historic Demand Data 2025", frozen at
 * 31 Dec 2025, and multiply today's % shares by it.)
 */

const UPSTREAM_TIMEOUT_MS = 8000;

/** GET JSON; null on network error, timeout, non-2xx or bad JSON. Never a fake value. */
async function getJson(label: string, url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[grid-demand] ${label} responded ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[grid-demand] ${label} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimit = await checkRateLimit(clientIP, 30, 60); // 30 req/min

  if (!rateLimit.allowed) {
    console.warn(`[RATE LIMIT] Blocked request. Retry after ${rateLimit.retryAfter}s`);
    return new Response(
      JSON.stringify({ error: 'Too many requests', retryAfter: rateLimit.retryAfter }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfter),
        },
      },
    );
  }

  try {
    const now = new Date();
    const [fuelinst, embedded, frequency] = await Promise.all([
      getJson('Elexon FUELINST', fuelinstUrl(now)),
      getJson('NESO embedded forecast', embeddedForecastUrl()),
      getJson('Elexon FREQ', frequencyUrl(now)),
    ]);

    const body = buildGridDemand({ now, fuelinst, embedded, frequency });
    if (body.status === 'unavailable') {
      console.warn(
        `[grid-demand] unavailable: ${body.reason} (newest data ${body.dataTime ?? 'none'})`,
      );
    }

    // 200 either way so the client still gets frequency and the reason;
    // the app shows its "unavailable" state when status !== 'ok'.
    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    return safeErrorResponse(
      { code: 'grid_demand_failed', error: 'Grid demand is unavailable', context: 'grid-demand' },
      error,
    );
  }
});

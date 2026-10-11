// Deno context wrapper
const _ignore = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = await checkRateLimit(clientIP, 20, 60); // 20 req/min

    if (!rateLimit.allowed) {
        // Don't log the IP (personal data); the rate limiter already keys on it.
        console.warn(`[RATE LIMIT] Blocked weather request. Retry after ${rateLimit.retryAfter}s`);
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
        const body = await req.json()

        // Parse and validate coordinates
        const lat = parseFloat(body.lat)
        const lon = parseFloat(body.lon)

        if (isNaN(lat) || lat < -90 || lat > 90) {
            return new Response(
                JSON.stringify({ error: 'Invalid latitude: must be between -90 and 90' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (isNaN(lon) || lon < -180 || lon > 180) {
            return new Response(
                JSON.stringify({ error: 'Invalid longitude: must be between -180 and 180' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Privacy: never log coordinates, and only send ~1 km precision (2 dp) to
        // Open-Meteo, which is finer than its model grid anyway.
        const roundedLat = Math.round(lat * 100) / 100
        const roundedLon = Math.round(lon * 100) / 100
        console.log('Fetching weather')

        // Open-Meteo Free API
        // Current weather: temperature, wind speed, cloud cover, weather code
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&current=temperature_2m,cloud_cover,wind_speed_10m,weather_code&wind_speed_unit=mph`

        const response = await fetch(url)
        const data = await response.json()

        if (data.error) {
            throw new Error(data.reason || 'Weather API Error')
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return new Response(
            JSON.stringify({ error: message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})

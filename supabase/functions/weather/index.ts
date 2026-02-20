// Deno context wrapper
const _ignore = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
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

        console.log(`Fetching weather for ${lat}, ${lon}`)

        // Open-Meteo Free API
        // Current weather: temperature, wind speed, cloud cover, weather code
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,cloud_cover,wind_speed_10m,weather_code&wind_speed_unit=mph`

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

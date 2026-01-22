// @ts-ignore: Suppress Deno namespace error if not in Deno context
const _ignore = null;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { lat, lon } = await req.json()

        if (!lat || !lon) {
            throw new Error('Missing lat/lon parameters')
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

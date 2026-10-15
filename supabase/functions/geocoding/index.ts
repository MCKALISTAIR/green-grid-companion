import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const query = body.query;

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedQuery = query.trim().toLowerCase();

    // 1. Check cache first
    const { data: cached, error: selectError } = await supabase
      .from('geocoding_cache')
      .select('*')
      .eq('query', normalizedQuery)
      .maybeSingle();

    if (selectError) {
      console.error(`[GEOCODING] Error querying cache:`, selectError);
    }

    if (cached) {
      console.log(`[GEOCODING] Cache hit for query: "${normalizedQuery}"`);
      return new Response(JSON.stringify(cached.response_json), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[GEOCODING] Cache miss for query: "${normalizedQuery}". Querying Nominatim...`);

    // 2. Fetch from OpenStreetMap Nominatim
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', United Kingdom')}&format=json&countrycodes=gb&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GridSense/1.0 (production geocoding proxy)' },
    });

    if (!res.ok) {
      throw new Error(`Nominatim request failed: ${res.statusText}`);
    }

    const data = await res.json();

    // 3. Store result in geocoding_cache (even if empty to prevent repeated useless searches)
    let lat = 51.5074; // Fallback to London coordinates if search returns nothing
    let lon = -0.1278;
    if (data && data.length > 0) {
      lat = parseFloat(data[0].lat);
      lon = parseFloat(data[0].lon);
    }

    const { error: insertError } = await supabase.from('geocoding_cache').upsert({
      query: normalizedQuery,
      latitude: lat,
      longitude: lon,
      response_json: data,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error(`[GEOCODING] Failed to cache query: "${normalizedQuery}"`, insertError);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[GEOCODING] Unexpected error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

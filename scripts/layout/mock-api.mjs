/**
 * Deterministic API mocks for layout checks (scripts/layout-guard.mjs) and the
 * screenshot sweep (scripts/layout-sweep.mjs). Intercepts every third-party call
 * the app makes so a production build renders a chosen state offline.
 *
 * Scenario fields:
 *   intensity, index        reading for the selected region (South Scotland, id 2)
 *   ageMinutes              how old the reading's `from` time is (stale = 60+)
 *   regionName              shortname returned for the region (long-name state)
 *   mix                     generation mix for the region
 *   actual                  NESO's published actual for the reading (default null: forecast only)
 *   flatSeries              true: the 24 h series is flat at `intensity` (no wobble), so a shot
 *                           named for N g shows N g
 *   place                   postcodes.io result override ({ postcode, outcode, latitude, ... })
 *   mode                    'ok' | 'error' (API 500s) | 'loading' (never answers)
 */

export const ZERO_CARBON_MIX = [
  { fuel: 'biomass', perc: 0 },
  { fuel: 'coal', perc: 0 },
  { fuel: 'imports', perc: 0 },
  { fuel: 'gas', perc: 0 },
  { fuel: 'nuclear', perc: 63 },
  { fuel: 'other', perc: 0 },
  { fuel: 'hydro', perc: 4 },
  { fuel: 'solar', perc: 0 },
  { fuel: 'wind', perc: 33 },
];

export const HIGH_CARBON_MIX = [
  { fuel: 'biomass', perc: 6 },
  { fuel: 'coal', perc: 2 },
  { fuel: 'imports', perc: 9 },
  { fuel: 'gas', perc: 61 },
  { fuel: 'nuclear', perc: 12 },
  { fuel: 'other', perc: 1 },
  { fuel: 'hydro', perc: 1 },
  { fuel: 'solar', perc: 0 },
  { fuel: 'wind', perc: 8 },
];

/** National mix used for /generation and grid-demand (matches the Demand-tab screenshot). */
export const NATIONAL_MIX = [
  { fuel: 'imports', perc: 23.6 },
  { fuel: 'wind', perc: 18.9 },
  { fuel: 'nuclear', perc: 15.3 },
  { fuel: 'gas', perc: 15.1 },
  { fuel: 'biomass', perc: 12.0 },
  { fuel: 'solar', perc: 10.4 },
  { fuel: 'other', perc: 2.6 },
  { fuel: 'hydro', perc: 2.1 },
  { fuel: 'coal', perc: 0 },
];

export const SCENARIOS = {
  'zero-carbon': { intensity: 0, index: 'very low', ageMinutes: 5, mix: ZERO_CARBON_MIX },
  'very-high': { intensity: 340, index: 'very high', ageMinutes: 5, mix: HIGH_CARBON_MIX },
  stale: { intensity: 0, index: 'very low', ageMinutes: 70, mix: ZERO_CARBON_MIX },
  'long-region': {
    intensity: 0,
    index: 'very low',
    ageMinutes: 5,
    mix: ZERO_CARBON_MIX,
    regionName: 'North Wales, Merseyside and Cheshire (Extended Test Region Name)',
  },
  loading: { mode: 'loading' },
  error: { mode: 'error' },
};

const halfHourFloor = (t) => new Date(Math.floor(t / 1800000) * 1800000);

export async function installMocks(context, scenarioIn = {}) {
  const s = {
    intensity: 0,
    index: 'very low',
    ageMinutes: 5,
    mix: ZERO_CARBON_MIX,
    mode: 'ok',
    ...scenarioIn,
  };
  const from = new Date(Date.now() - s.ageMinutes * 60000);
  const fromIso = from.toISOString().replace(/\.\d+Z$/, 'Z');
  const toIso = new Date(from.getTime() + 1800000).toISOString().replace(/\.\d+Z$/, 'Z');
  const reading = {
    from: fromIso,
    to: toIso,
    intensity: { forecast: s.intensity, actual: s.actual ?? null, index: s.index },
    generationmix: s.mix,
  };
  const regionShort = s.regionName ?? 'South Scotland';
  const series = () => {
    const start = halfHourFloor(Date.now() - 24 * 3600000).getTime();
    return Array.from({ length: 144 }, (_, i) => {
      const f = new Date(start + i * 1800000);
      // flatSeries: every slot reads the scenario's own value (hero shots per band).
      const wobble = s.flatSeries ? 0 : 40 * Math.sin(i / 6);
      const v = Math.max(0, Math.round((s.intensity || 0) + wobble));
      return {
        from: f.toISOString().replace(/\.\d+Z$/, 'Z'),
        to: new Date(f.getTime() + 1800000).toISOString().replace(/\.\d+Z$/, 'Z'),
        intensity: {
          forecast: v,
          // The open half hour carries the scenario's `actual` when one is set
          // (null = NESO has only the forecast so far).
          actual:
            f.getTime() + 1800000 > Date.now() && 'actual' in s
              ? s.actual
              : f.getTime() < Date.now()
                ? v
                : null,
          // NESO 2026 bands (src/lib/nesoBand.ts), so the mocked index matches bandFor().
          index:
            v <= 24
              ? 'very low'
              : v <= 89
                ? 'low'
                : v <= 169
                  ? 'moderate'
                  : v <= 230
                    ? 'high'
                    : 'very high',
        },
        generationmix: s.mix,
      };
    });
  };
  const json = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(body),
    });

  // Playwright matches the most recently registered route first, so the catch-all goes first.
  await context.route(/supabase\.co\/(functions|rest|auth)\//, (route) => json(route, {}));
  await context.route(/api\.carbonintensity\.org\.uk/, async (route) => {
    if (s.mode === 'loading') return; // never answer
    if (s.mode === 'error') return json(route, { error: { code: '500', message: 'mock' } }, 500);
    const p = new URL(route.request().url()).pathname;
    if (p === '/intensity') return json(route, { data: [reading] });
    if (p === '/generation')
      return json(route, { data: { from: fromIso, to: toIso, generationmix: NATIONAL_MIX } });
    if (p === '/regional') {
      return json(route, {
        data: [
          {
            from: fromIso,
            to: toIso,
            regions: [
              {
                regionid: 2,
                dnoregion: 'SP Distribution',
                shortname: 'South Scotland',
                intensity: reading.intensity,
                generationmix: s.mix,
              },
              {
                regionid: 13,
                dnoregion: 'UKPN London',
                shortname: 'London',
                intensity: reading.intensity,
                generationmix: s.mix,
              },
            ],
          },
        ],
      });
    }
    if (/^\/regional\/(regionid\/\d+|postcode\/[^/]+)$/.test(p)) {
      return json(route, {
        data: [
          { regionid: 2, dnoregion: 'SP Distribution', shortname: regionShort, data: [reading] },
        ],
      });
    }
    if (/^\/regional\/intensity\//.test(p))
      return json(route, { data: { regionid: 2, shortname: regionShort, data: series() } });
    if (/^\/intensity\/[^/]+\/[^/]+/.test(p)) return json(route, { data: series() });
    return json(route, { data: [] });
  });

  await context.route(/supabase\.co\/functions\/v1\/grid-demand/, (route) => {
    if (s.mode !== 'ok')
      return s.mode === 'loading' ? undefined : json(route, { error: 'mock' }, 500);
    const total = 24750;
    return json(route, {
      status: 'ok',
      timestamp: fromIso,
      dataTime: fromIso,
      fetchedAt: new Date().toISOString(),
      settlementDate: null,
      settlementPeriod: null,
      totalDemandMW: total,
      gridFrequency: 50.01,
      frequencyTime: fromIso,
      embeddedSolarMW: 900,
      embeddedWindMW: 600,
      mix: NATIONAL_MIX.map((m) => ({
        id: m.fuel,
        name: m.fuel,
        fuel: m.fuel,
        perc: m.perc,
        mw: Math.round((total * m.perc) / 100),
      })).sort((a, b) => b.mw - a.mw),
    });
  });
  await context.route(/api\.open-meteo\.com/, (route) =>
    json(route, {
      current: {
        temperature_2m: 11,
        relative_humidity_2m: 70,
        weather_code: 2,
        cloud_cover: 40,
        wind_speed_10m: 18,
        is_day: 1,
        // Optional per-scenario weather (art pass screenshots: wind, rain, overcast).
        ...(s.weather || {}),
      },
      daily: {
        sunrise: [new Date().toISOString().slice(0, 10) + 'T07:20'],
        sunset: [new Date().toISOString().slice(0, 10) + 'T18:20'],
      },
    }),
  );
  await context.route(/api\.postcodes\.io/, (route) =>
    json(route, {
      status: 200,
      // Optional per-scenario place (hero shots in London, inland England...).
      result: s.place || {
        postcode: 'EH1 1YZ',
        outcode: 'EH1',
        latitude: 55.95,
        longitude: -3.19,
        admin_district: 'City of Edinburgh',
        region: null,
        country: 'Scotland',
      },
    }),
  );
  await context.route(/nominatim\.openstreetmap\.org/, (route) => json(route, []));
  await context.route(/sentry\.io|ingest\./, (route) => route.fulfill({ status: 204, body: '' }));
}

/** localStorage seed: onboarding done, no tour/splash/notification ask (#52), consent declined, South Scotland postcode. */
export function seedStorage({ postcode = 'EH1 1YZ', theme = 'light' } = {}) {
  return `(() => {
    if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1');
    const s = { 'onboarding_complete': 'true', 'product_tour_seen': 'true', 'skip_splash': 'true',
      'gridsense-notification-nudge': 'no', 'cookie-consent': 'declined', 'cookie-consent-version': '2', 'gridgreen-postcode': ${JSON.stringify(postcode)},
      'vite-ui-theme': ${JSON.stringify(theme)} };
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  })();`;
}

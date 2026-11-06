// Test-only harness: runs a scheduled digest function's real handler against an
// in-memory fake PostgREST + NESO, with push credentials unset so
// sendPushNotifications only logs "[PUSH MOCK]" lines. No network, no DB, no pushes.
export type Row = Record<string, unknown>;
export const SECRET = 'x'.repeat(40);

function applyFilters(rows: Row[], params: URLSearchParams): Row[] {
  let out = rows;
  for (const [col, raw] of params) {
    if (['select', 'order', 'limit', 'on_conflict', 'columns'].includes(col)) continue;
    const dot = raw.indexOf('.');
    const op = raw.slice(0, dot);
    const val = raw.slice(dot + 1);
    out = out.filter((r) => {
      const v = r[col];
      if (op === 'eq') return String(v) === val;
      if (op === 'in') {
        const list = val
          .replace(/^\(|\)$/g, '')
          .split(',')
          .map((s) => s.replace(/^"|"$/g, ''));
        return list.includes(String(v));
      }
      if (op === 'gte') return String(v) >= val;
      if (op === 'lte') return String(v) <= val;
      if (op === 'not' && val === 'is.null') return v !== null && v !== undefined;
      return true;
    });
  }
  return out;
}

/**
 * `load` must be a literal `() => import('./index.ts')` in the caller so Deno
 * resolves the module statically: a computed specifier needs --allow-read,
 * which the CI command (--allow-env --allow-net=127.0.0.1) doesn't grant (BH-76).
 * Each scope test runs once per module, so no cache-busting is needed.
 */
export async function runDigest(
  load: () => Promise<unknown>,
  tables: Record<string, Row[]>,
  forecast: Row[],
): Promise<{ status: number; json: Record<string, unknown>; pushes: string[]; queries: string[] }> {
  const pushes: string[] = [];
  const queries: string[] = [];
  const env: Record<string, string> = {
    SUPABASE_URL: 'http://db.test',
    SUPABASE_SERVICE_ROLE_KEY: 'service-test',
  };
  const origEnvGet = Deno.env.get;
  Deno.env.get = (k: string) => env[k];
  const origLog = console.log;
  console.log = (...a: unknown[]) => {
    const s = a.map(String).join(' ');
    if (s.startsWith('[PUSH MOCK]')) pushes.push(s);
  };
  const origWarn = console.warn;
  console.warn = () => {};
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (input: Request | URL | string, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(String(input), init);
    const url = new URL(req.url);
    if (url.host === 'api.carbonintensity.org.uk') {
      return Response.json({ data: forecast });
    }
    if (url.host !== 'db.test') throw new Error(`blocked network: ${url}`);
    if (url.pathname === '/rest/v1/rpc/get_scheduler_secret') return Response.json(SECRET);
    const table = url.pathname.replace('/rest/v1/', '');
    queries.push(`${req.method} ${table}?${url.searchParams}`);
    if (req.method === 'POST') {
      const body = JSON.parse(await req.text());
      return Response.json(Array.isArray(body) ? body : [body], { status: 201 });
    }
    return Response.json(applyFilters(tables[table] ?? [], url.searchParams));
  }) as typeof fetch;

  let handler: ((r: Request) => Promise<Response>) | undefined;
  const origServe = Deno.serve;
  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Deno as any).serve = (h: (r: Request) => Promise<Response>) => {
    handler = h;
    return { finished: Promise.resolve(), shutdown() {} };
  };
  try {
    await load();
    const res = await handler!(
      new Request('http://fn.test', { method: 'POST', headers: { 'x-cron-secret': SECRET } }),
    );
    return { status: res.status, json: await res.json(), pushes, queries };
  } finally {
    // deno-lint-ignore no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Deno as any).serve = origServe;
    globalThis.fetch = origFetch;
    Deno.env.get = origEnvGet;
    console.log = origLog;
    console.warn = origWarn;
  }
}

/** Two users, two meters, one anonymous subscriber. */
export function twoUserFixture(intervalStartIso: string, day: number) {
  const subs = [
    {
      id: 's-alice',
      user_id: 'u-alice',
      device_token: 'tok-alice-0000',
      postcode: 'EH1',
      platform: 'ios',
      is_sandbox: true,
      weekly_digest_enabled: true,
      weekly_digest_day: day,
      monthly_report_enabled: true,
    },
    {
      id: 's-bob',
      user_id: 'u-bob',
      device_token: 'tok-bob-00000',
      postcode: 'SW1',
      platform: 'ios',
      is_sandbox: true,
      weekly_digest_enabled: true,
      weekly_digest_day: day,
      monthly_report_enabled: true,
    },
    {
      id: 's-anon',
      user_id: null,
      device_token: 'tok-anon-0000',
      postcode: 'G1',
      platform: 'ios',
      is_sandbox: true,
      weekly_digest_enabled: true,
      weekly_digest_day: day,
      monthly_report_enabled: true,
    },
  ];
  const meters = [
    { user_id: 'u-alice', mpan: 'MPAN-A' },
    { user_id: 'u-bob', mpan: 'MPAN-B' },
  ];
  const row = (mpan: string, kwh: number, idx: string) => ({
    mpan,
    interval_start: intervalStartIso,
    interval_end: intervalStartIso,
    consumption_kwh: kwh,
    intensity_gco2_kwh: 100,
    carbon_g: kwh * 100,
    intensity_index: idx,
  });
  return {
    push_subscriptions: subs,
    octopus_meters: meters,
    carbon_footprint: [row('MPAN-A', 10, 'low'), row('MPAN-B', 90, 'high')],
  };
}

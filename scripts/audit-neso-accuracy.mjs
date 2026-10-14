#!/usr/bin/env node
/**
 * Live accuracy audit against the NESO Carbon Intensity API.
 *
 * Compares GridSense mix-based estimates (CARBON_FACTORS) to published national
 * actuals, and regional mix estimates to NESO regional forecasts.
 *
 * Usage:
 *   node scripts/audit-neso-accuracy.mjs
 *   node scripts/audit-neso-accuracy.mjs --days 14 --json /tmp/audit.json
 *
 * Exit code 1 if national mix-est MAE vs actual exceeds the gate (default 12 g).
 */

const BASE = 'https://api.carbonintensity.org.uk';

/** Keep in sync with src/lib/carbonApi.ts CARBON_FACTORS / REGION_IMPORTS_FACTOR. */
const CARBON_FACTORS = {
  biomass: 120,
  coal: 937,
  imports: 53,
  gas: 394,
  nuclear: 0,
  other: 300,
  hydro: 0,
  solar: 0,
  wind: 0,
};

const REGION_IMPORTS_FACTOR = {
  4: 40,
  10: 405,
  13: 120,
};

const REGIONS = [
  { id: 1, name: 'North Scotland' },
  { id: 2, name: 'South Scotland' },
  { id: 4, name: 'North East England' },
  { id: 10, name: 'East England' },
  { id: 12, name: 'South England' },
  { id: 13, name: 'London' },
  { id: 14, name: 'South East' },
];

function factorsForRegion(regionId) {
  const imports = REGION_IMPORTS_FACTOR[regionId] ?? CARBON_FACTORS.imports;
  if (imports === CARBON_FACTORS.imports) return CARBON_FACTORS;
  return { ...CARBON_FACTORS, imports };
}

function parseArgs(argv) {
  const out = { days: 14, gateMae: 12, jsonPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--days') out.days = Number(argv[++i]);
    else if (a === '--gate-mae') out.gateMae = Number(argv[++i]);
    else if (a === '--json') out.jsonPath = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/audit-neso-accuracy.mjs [--days 14] [--gate-mae 12] [--json out.json]');
      process.exit(0);
    }
  }
  if (!Number.isFinite(out.days) || out.days < 1 || out.days > 30) {
    throw new Error('--days must be 1–30');
  }
  return out;
}

/** NESO outage (network / 5xx / 429) after retries — exit 2, distinct from a gate failure (exit 1). */
class UpstreamError extends Error {}

const FETCH_TIMEOUT_MS = Number(process.env.NESO_FETCH_TIMEOUT_MS ?? 20000);
const FETCH_ATTEMPTS = Number(process.env.NESO_FETCH_ATTEMPTS ?? 4);

async function getJson(path) {
  let lastErr;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) return await res.json();
      lastErr = new Error(`GET ${path} → ${res.status}`);
      if (res.status < 500 && res.status !== 429) throw lastErr; // 4xx = our bug, don't retry
    } catch (err) {
      lastErr = err;
      if (err?.message?.includes('→ 4') && !err.message.endsWith('429')) throw err;
    }
    if (attempt < FETCH_ATTEMPTS) {
      const wait = 2000 * 2 ** (attempt - 1);
      console.warn(`[audit] ${path} failed (${lastErr?.message}); retry ${attempt}/${FETCH_ATTEMPTS - 1} in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new UpstreamError(`NESO unavailable after ${FETCH_ATTEMPTS} attempts: ${lastErr?.message}`);
}

function calcFromMix(mix, factors = CARBON_FACTORS) {
  if (!Array.isArray(mix) || mix.length === 0) return null;
  let total = 0;
  for (const source of mix) {
    const factor = factors[source.fuel] ?? 0;
    const perc = Number.isFinite(source?.perc) ? source.perc : 0;
    total += (perc / 100) * factor;
  }
  return Math.round(total);
}

function summarize(errors) {
  const n = errors.length;
  if (!n) return null;
  const abs = errors.map((e) => Math.abs(e));
  const mae = abs.reduce((a, b) => a + b, 0) / n;
  const bias = errors.reduce((a, b) => a + b, 0) / n;
  const rmse = Math.sqrt(errors.reduce((a, e) => a + e * e, 0) / n);
  const sorted = [...abs].sort((a, b) => a - b);
  const pct = (limit) => (100 * abs.filter((e) => e <= limit).length) / n;
  return {
    n,
    mae: round2(mae),
    rmse: round2(rmse),
    bias: round2(bias),
    p50: sorted[Math.floor(0.5 * (n - 1))],
    p90: sorted[Math.floor(0.9 * (n - 1))],
    p95: sorted[Math.floor(0.95 * (n - 1))],
    maxAbs: Math.max(...abs),
    within10Pct: round1(pct(10)),
    within20Pct: round1(pct(20)),
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

function halfHourFloor(d = new Date()) {
  const x = new Date(d);
  x.setUTCSeconds(0, 0);
  x.setUTCMinutes(x.getUTCMinutes() < 30 ? 0 : 30);
  return x;
}

/** Format as NESO expects: YYYY-MM-DDTHH:MMZ */
function nesoStamp(d) {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}-${mo}-${da}T${h}:${mi}Z`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const end = halfHourFloor();
  const start = new Date(end.getTime() - args.days * 24 * 60 * 60 * 1000);
  const from = nesoStamp(start);
  const to = nesoStamp(end);

  console.log(`GridSense NESO accuracy audit`);
  console.log(`Window: ${from} → ${to} (${args.days}d)`);
  console.log(`Factors: imports default=${CARBON_FACTORS.imports}, gas=${CARBON_FACTORS.gas} (CCGT)`);
  console.log(
    `Region imports overrides: ${Object.entries(REGION_IMPORTS_FACTOR)
      .map(([id, f]) => `${id}→${f}`)
      .join(', ')}`,
  );
  console.log('');

  const [natBody, genBody, factorsBody, currentBody] = await Promise.all([
    getJson(`/intensity/${from}/${to}`),
    getJson(`/generation/${from}/${to}`),
    getJson('/intensity/factors'),
    getJson('/intensity'),
  ]);

  const liveFactors = factorsBody.data?.[0] ?? {};
  const factorCheck = {
    Biomass: liveFactors.Biomass === CARBON_FACTORS.biomass,
    Coal: liveFactors.Coal === CARBON_FACTORS.coal,
    'Gas (Combined Cycle)': liveFactors['Gas (Combined Cycle)'] === CARBON_FACTORS.gas,
    Other: liveFactors.Other === CARBON_FACTORS.other,
    'French Imports': liveFactors['French Imports'] === CARBON_FACTORS.imports,
  };

  const nat = new Map((natBody.data || []).map((p) => [p.from, p]));
  const gen = genBody.data || [];

  const mixVsActual = [];
  const forecastVsActual = [];
  for (const g of gen) {
    const n = nat.get(g.from);
    const actual = n?.intensity?.actual;
    const forecast = n?.intensity?.forecast;
    if (typeof actual !== 'number') continue;
    const est = calcFromMix(g.generationmix);
    if (est === null) continue;
    mixVsActual.push(est - actual);
    if (typeof forecast === 'number') forecastVsActual.push(forecast - actual);
  }

  const mixSummary = summarize(mixVsActual);
  const forecastSummary = summarize(forecastVsActual);

  const current = currentBody.data?.[0];
  const currentEst = calcFromMix(
    (await getJson('/generation')).data?.generationmix ?? [],
  );

  const regional = [];
  for (const region of REGIONS) {
    const body = await getJson(`/regional/intensity/${from}/${to}/regionid/${region.id}`);
    const slots = body.data?.data || [];
    const factors = factorsForRegion(region.id);
    const errors = [];
    const defaultErrors = [];
    let maxImport = 0;
    for (const s of slots) {
      if (!s.generationmix || typeof s.intensity?.forecast !== 'number') continue;
      const est = calcFromMix(s.generationmix, factors);
      const defaultEst = calcFromMix(s.generationmix, CARBON_FACTORS);
      if (est === null || defaultEst === null) continue;
      errors.push(est - s.intensity.forecast);
      defaultErrors.push(defaultEst - s.intensity.forecast);
      const imp = s.generationmix.find((m) => m.fuel === 'imports')?.perc ?? 0;
      if (imp > maxImport) maxImport = imp;
    }
    const vsForecast = summarize(errors);
    const vsForecastDefault = summarize(defaultErrors);
    regional.push({
      region: region.name,
      regionId: region.id,
      importsFactor: factors.imports,
      maxImportPct: round1(maxImport),
      vsForecast,
      vsForecastDefaultFrench53: vsForecastDefault,
      maeImprovementVsDefault:
        vsForecast && vsForecastDefault
          ? round2(vsForecastDefault.mae - vsForecast.mae)
          : null,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    window: { from, to, days: args.days },
    factorsMatchLiveApi: factorCheck,
    currentHalfHour: current
      ? {
          from: current.from,
          to: current.to,
          forecast: current.intensity?.forecast ?? null,
          actual: current.intensity?.actual ?? null,
          mixEstimate: currentEst,
        }
      : null,
    national: {
      mixEstimateVsActual: mixSummary,
      nesoForecastVsActual: forecastSummary,
      mixBetterThanForecastPct: mixSummary && forecastSummary
        ? round1(
            (100 *
              mixVsActual.filter((e, i) => Math.abs(e) < Math.abs(forecastVsActual[i])).length) /
              mixVsActual.length,
          )
        : null,
    },
    regionalMixEstimateVsNesoForecast: regional,
    gate: { nationalMixMaeMax: args.gateMae, passed: mixSummary ? mixSummary.mae <= args.gateMae : false },
  };

  const printSummary = (label, s) => {
    if (!s) {
      console.log(`${label}: no data`);
      return;
    }
    console.log(
      `${label}: n=${s.n} MAE=${s.mae} RMSE=${s.rmse} bias=${s.bias} p50=${s.p50} p90=${s.p90} max=${s.maxAbs} ≤10g=${s.within10Pct}% ≤20g=${s.within20Pct}%`,
    );
  };

  console.log('Factor check vs /intensity/factors:');
  for (const [k, ok] of Object.entries(factorCheck)) {
    console.log(`  ${ok ? 'OK' : 'DRIFT'}  ${k}`);
  }
  console.log('');
  if (report.currentHalfHour) {
    const c = report.currentHalfHour;
    console.log(
      `Current half-hour ${c.from}: forecast=${c.forecast} actual=${c.actual} mix-est=${c.mixEstimate}`,
    );
  }
  console.log('');
  printSummary('National mix-est vs NESO ACTUAL', mixSummary);
  printSummary('NESO forecast vs NESO ACTUAL   ', forecastSummary);
  if (report.national.mixBetterThanForecastPct != null) {
    console.log(`Mix-est closer than NESO forecast: ${report.national.mixBetterThanForecastPct}% of half-hours`);
  }
  console.log('');
  console.log('Regional mix-est vs NESO regional FORECAST (no regional actuals published):');
  for (const r of regional) {
    const s = r.vsForecast;
    if (!s) continue;
    const improved =
      r.maeImprovementVsDefault != null && r.maeImprovementVsDefault > 0
        ? `  ΔMAE=${r.maeImprovementVsDefault > 0 ? '−' : '+'}${Math.abs(r.maeImprovementVsDefault)} vs default`
        : '';
    console.log(
      `  ${r.region.padEnd(18)} impF=${String(r.importsFactor).padStart(3)} MAE=${String(s.mae).padStart(5)} bias=${String(s.bias).padStart(7)} maxImport=${String(r.maxImportPct).padStart(5)}%${improved}`,
    );
  }
  console.log('');
  console.log(
    report.gate.passed
      ? `GATE PASS: national mix MAE ${mixSummary?.mae} ≤ ${args.gateMae} g`
      : `GATE FAIL: national mix MAE ${mixSummary?.mae} > ${args.gateMae} g`,
  );

  if (args.jsonPath) {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    const { dirname } = await import('node:path');
    mkdirSync(dirname(args.jsonPath), { recursive: true });
    writeFileSync(args.jsonPath, JSON.stringify(report, null, 2));
    console.log(`Wrote ${args.jsonPath}`);
  }

  process.exit(report.gate.passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

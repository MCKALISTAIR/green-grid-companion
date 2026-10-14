import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildGridDemand,
  latestFuelinstSnapshot,
  embeddedForPeriod,
  latestFrequency,
  fuelinstUrl,
  frequencyUrl,
  embeddedForecastUrl,
  MIX_MAX_AGE_MINUTES,
  type GridDemandOk,
} from '../../supabase/functions/_shared/grid-demand.ts';
import { gridDemandUnavailableReason, liveGridFrequency } from '@/lib/gridDemand';

const fixture = (name: string) =>
  JSON.parse(readFileSync(resolve(__dirname, 'fixtures/grid-demand', name), 'utf-8'));

// Recorded live, 2026-10-11 10:43:38Z (11:43 BST). See fixtures/grid-demand/README.md.
const RECORDED_AT = new Date('2026-10-11T10:43:38Z');
const fuelinst = fixture('elexon-fuelinst.json');
const embedded = fixture('neso-embedded-forecast.json');
const frequency = fixture('elexon-frequency.json');

const live = () =>
  buildGridDemand({ now: RECORDED_AT, fuelinst, embedded, frequency }) as GridDemandOk;
const mw = (r: GridDemandOk, fuel: string) => r.mix.find((m) => m.id === fuel)?.mw;

describe('grid-demand: live sources (recorded fixtures)', () => {
  it('builds real per-fuel MW from Elexon FUELINST plus NESO embedded solar/wind', () => {
    const r = live();
    expect(r.status).toBe('ok');
    expect(r.timestamp).toBe('2026-10-11T10:35:00.000Z');
    expect(r.settlementDate).toBe('2026-10-11');
    expect(r.settlementPeriod).toBe(24);

    expect(mw(r, 'gas')).toBe(3732); // CCGT 3732 + OCGT 0
    expect(mw(r, 'nuclear')).toBe(4018);
    expect(mw(r, 'biomass')).toBe(2974);
    expect(mw(r, 'hydro')).toBe(862); // NPSHYD only, not pumped storage
    expect(mw(r, 'other')).toBe(797); // OTHER + OIL (PS was pumping, -9)
    expect(mw(r, 'coal')).toBe(0);
    expect(mw(r, 'wind')).toBe(3658 + 219); // transmission + embedded estimate
    expect(mw(r, 'solar')).toBe(6679); // NESO embedded estimate for SP24
    expect(mw(r, 'imports')).toBe(2001 + 992 + 1046 + 1016 + 1249 + 1423);
    expect(r.exportsMW).toBe(83 + 63); // Greenlink, Moyle/EWIC to Ireland

    expect(r.totalSupplyMW).toBe(30666);
    expect(r.totalDemandMW).toBe(30520);
    expect(r.mix.reduce((s, m) => s + m.mw, 0)).toBe(r.totalSupplyMW);
    expect(r.embeddedSolarMW).toBe(6679);
    expect(r.embeddedWindMW).toBe(219);
    expect(r.embeddedIsEstimate).toBe(true);
    expect(r.gridFrequency).toBe(50.029);
    expect(r.frequencyTime).toBe('2026-10-11T10:41:45.000Z');
  });

  it('is no longer the frozen 31 Dec 2025 total', () => {
    expect(live().totalDemandMW).not.toBe(24730);
  });

  it('percentages are shares of the same MW snapshot, sorted by MW', () => {
    const r = live();
    for (const m of r.mix) expect(m.perc).toBeCloseTo((m.mw / r.totalSupplyMW) * 100, 0);
    expect(r.mix.reduce((s, m) => s + m.perc, 0)).toBeCloseTo(100, 0);
    expect(r.mix.map((m) => m.id)).toEqual([
      'imports',
      'solar',
      'nuclear',
      'wind',
      'gas',
      'biomass',
      'hydro',
      'other',
      'coal',
    ]);
  });

  it('keeps every fuel id the app knows, including 0 MW ones', () => {
    expect(
      live()
        .mix.map((m) => m.id)
        .sort(),
    ).toEqual(['biomass', 'coal', 'gas', 'hydro', 'imports', 'nuclear', 'other', 'solar', 'wind']);
  });
});

describe('grid-demand: refuses old or partial data', () => {
  it('refuses figures older than the threshold (no old numbers)', () => {
    const later = new Date(Date.parse('2026-10-11T10:35:00Z') + (MIX_MAX_AGE_MINUTES + 1) * 60_000);
    const r = buildGridDemand({ now: later, fuelinst, embedded, frequency });
    expect(r.status).toBe('unavailable');
    expect(r).toMatchObject({
      reason: 'mix_stale',
      timestamp: null,
      totalDemandMW: null,
      mix: [],
      dataTime: '2026-10-11T10:35:00.000Z',
    });
    expect(r.gridFrequency).toBeNull(); // frequency reading is old too
  });

  it('upstream failure is "unavailable", never a fallback figure', () => {
    for (const bad of [null, {}, { data: [] }, { error: 'x' }, 'nope']) {
      const r = buildGridDemand({ now: RECORDED_AT, fuelinst: bad, embedded, frequency });
      expect(r).toMatchObject({
        status: 'unavailable',
        reason: 'mix_fetch_failed',
        totalDemandMW: null,
        mix: [],
      });
      expect(r.gridFrequency).toBe(50.029); // independent source still shown
    }
  });

  it('refuses the mix when NESO embedded solar/wind is missing (solar would be several GW short)', () => {
    for (const bad of [null, { success: false }, { success: true, result: { records: [] } }]) {
      const r = buildGridDemand({ now: RECORDED_AT, fuelinst, embedded: bad, frequency });
      expect(r).toMatchObject({ status: 'unavailable', reason: 'embedded_unavailable', mix: [] });
    }
  });

  it('refuses an old NESO forecast run (current period not near the start of the run)', () => {
    const records = embedded.result.records as Record<string, unknown>[];
    // Pretend the run started 9 half hours earlier: SP24 is now row 10.
    const oldRun = {
      success: true,
      result: {
        records: records
          .map((r, i) => ({ ...r, _id: i + 10 }))
          .concat(
            Array.from({ length: 9 }, (_, i) => ({
              ...records[0],
              _id: i + 1,
              SETTLEMENT_PERIOD: 10 + i,
            })),
          ),
      },
    };
    expect(embeddedForPeriod(oldRun, '2026-10-11', 24)).toBeNull();
    expect(embeddedForPeriod(embedded, '2026-10-11', 24)).toEqual({
      solarMW: 6679,
      windMW: 219,
      settlementDate: '2026-10-11',
      settlementPeriod: 24,
    });
    expect(embeddedForPeriod(embedded, '2026-10-12', 24)).toBeNull();
  });

  it('skips a partial newest FUELINST interval and uses the latest complete one', () => {
    const rows = (fuelinst.data as Record<string, unknown>[]).concat([
      {
        dataset: 'FUELINST',
        publishTime: '2026-10-11T10:45:00Z',
        startTime: '2026-10-11T10:40:00Z',
        settlementDate: '2026-10-11',
        settlementPeriod: 24,
        fuelType: 'WIND',
        generation: 9999,
      },
    ]);
    expect(latestFuelinstSnapshot({ data: rows })?.startTime).toBe('2026-10-11T10:35:00.000Z');
  });

  it('uses the newest revision when FUELINST republishes an interval', () => {
    const rows = (fuelinst.data as Record<string, unknown>[]).concat([
      {
        dataset: 'FUELINST',
        publishTime: '2026-10-11T10:41:00Z',
        startTime: '2026-10-11T10:35:00Z',
        settlementDate: '2026-10-11',
        settlementPeriod: 24,
        fuelType: 'NUCLEAR',
        generation: 4100,
      },
    ]);
    expect(latestFuelinstSnapshot({ data: rows })?.byFuelType.NUCLEAR).toBe(4100);
  });

  it('ignores old or implausible frequency readings', () => {
    expect(latestFrequency(frequency, new Date('2026-10-11T11:30:00Z'))).toBeNull();
    expect(
      latestFrequency(
        { data: [{ measurementTime: '2026-10-11T10:43:00Z', frequency: 0 }] },
        RECORDED_AT,
      ),
    ).toBeNull();
    expect(
      latestFrequency(
        { data: [{ measurementTime: '2026-10-11T10:43:00Z', frequency: 49.98 }] },
        RECORDED_AT,
      )?.frequency,
    ).toBe(49.98);
  });
});

describe('grid-demand: request URLs', () => {
  it('asks for a recent window, never the whole of yesterday', () => {
    const now = new Date('2026-10-11T10:43:38Z');
    expect(fuelinstUrl(now)).toContain(
      '/datasets/FUELINST?publishDateTimeFrom=2026-10-11T09%3A58%3A38.000Z',
    );
    expect(frequencyUrl(now)).toContain(
      '/system/frequency?from=2026-10-11T10%3A28%3A38.000Z&to=2026-10-11T10%3A43%3A38.000Z',
    );
    expect(embeddedForecastUrl()).toContain('resource_id=db6c038f-98af-4570-ab60-24d71ebd0ae5');
  });

  it('edge function no longer reads the frozen Historic Demand 2025 resource, keeps rate limiting and checks response.ok', () => {
    const src = readFileSync(
      resolve(__dirname, '../../supabase/functions/grid-demand/index.ts'),
      'utf-8',
    );
    expect(src).not.toContain('b2bde559-3455-4021-b179-dfe60c0337b0');
    expect(src).not.toContain('carbonintensity.org.uk');
    expect(src).toContain('checkRateLimit(clientIP, 30, 60)');
    expect(src).toContain('if (!res.ok)');
  });
});

describe('useGridDemand freshness gate', () => {
  const ok = live();
  const at = (iso: string) => Date.parse(iso);

  it('shows a fresh ok response', () => {
    expect(gridDemandUnavailableReason(ok, at('2026-10-11T10:43:38Z'))).toBeNull();
    expect(liveGridFrequency(ok, at('2026-10-11T10:43:38Z'))).toBe(50.029);
  });

  it('hides a cached ok response once it is old', () => {
    expect(gridDemandUnavailableReason(ok, at('2026-10-11T11:06:00Z'))).toBe('stale');
    expect(liveGridFrequency(ok, at('2026-10-11T11:00:00Z'))).toBeNull();
  });

  it('hides the old function’s frozen response (no status, fake-fresh timestamp)', () => {
    const old = {
      timestamp: '2026-10-11T10:43:00Z',
      totalDemandMW: 24730,
      gridFrequency: null,
      mix: [{ id: 'wind', perc: 20, mw: 4946 }],
    };
    expect(gridDemandUnavailableReason(old, at('2026-10-11T10:43:38Z'))).toBe('unavailable');
  });

  it('passes the server reason through', () => {
    const r = buildGridDemand({ now: RECORDED_AT, fuelinst: null, embedded, frequency });
    expect(gridDemandUnavailableReason(r, at('2026-10-11T10:43:38Z'))).toBe('mix_fetch_failed');
  });
});

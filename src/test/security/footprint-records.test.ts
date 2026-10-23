import { describe, it, expect } from 'vitest';
import {
  buildIntensityMap,
  buildFootprintRows,
} from '../../../supabase/functions/_shared/footprint-records.ts';
import { halfHourKeyToIso } from '../../../supabase/functions/_shared/half-hour.ts';
import national from '../fixtures/neso-national-2026-10-11.json';
import londonRegional from '../fixtures/neso-regional-london-fw48h-2026-10-11.json';

const MPAN = '1300000000000';

describe('Octopus footprint spot-check (carbon_g = kWh × intensity)', () => {
  it('national path prefers NESO actual over forecast', () => {
    // 2026-10-10T23:00Z: forecast 45, actual 63, low
    const { map } = buildIntensityMap(national, false);
    const [row] = buildFootprintRows(
      [{ interval_start: '2026-10-10T23:00Z', interval_end: '2026-10-10T23:30Z', kwh: 0.5 }],
      map,
      MPAN,
    );
    expect(row.intensity_gco2_kwh).toBe(63);
    expect(row.intensity_index).toBe('low');
    expect(row.carbon_g).toBeCloseTo(31.5, 6);
  });

  it('regional path (London) uses forecast when there is no actual', () => {
    // 2026-10-11T10:00Z: forecast 102, moderate, no actual
    const { map } = buildIntensityMap(londonRegional, true);
    const [row] = buildFootprintRows(
      [{ interval_start: '2026-10-11T10:00Z', interval_end: '2026-10-11T10:30Z', kwh: 1.2 }],
      map,
      MPAN,
    );
    expect(row.intensity_gco2_kwh).toBe(102);
    expect(row.carbon_g).toBeCloseTo(122.4, 6);
  });

  it('skips half-hours with no usable intensity instead of writing 0 g / moderate', () => {
    const json = {
      data: [
        { from: '2026-10-11T00:00Z', intensity: { actual: null, forecast: null, index: 'low' } },
        { from: '2026-10-11T00:30Z', intensity: { forecast: 80, index: 'low' } },
      ],
    };
    const { map, skipped } = buildIntensityMap(json, false);
    expect(skipped).toBe(1);
    const rows = buildFootprintRows(
      [
        { interval_start: '2026-10-11T00:00Z', interval_end: '2026-10-11T00:30Z', kwh: 2 },
        { interval_start: '2026-10-11T00:30Z', interval_end: '2026-10-11T01:00Z', kwh: 2 },
        { interval_start: '2026-10-11T05:00Z', interval_end: '2026-10-11T05:30Z', kwh: 2 },
      ],
      map,
      MPAN,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].carbon_g).toBe(160);
  });

  it('every fixture half-hour satisfies carbon_g = kWh × intensity', () => {
    const { map } = buildIntensityMap(national, false);
    const rows = buildFootprintRows(
      [...map.keys()].map((k) => ({
        interval_start: halfHourKeyToIso(k),
        interval_end: halfHourKeyToIso(k + 1),
        kwh: 0.37,
      })),
      map,
      MPAN,
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows)
      expect(r.carbon_g).toBeCloseTo(r.consumption_kwh * r.intensity_gco2_kwh, 9);
  });

  // BH-91: these used to pass only because the readings above are spelled the
  // NESO way. Real readings come from Octopus or the DB, spelled differently.
  it('matches DB "+00:00" and Octopus "+01:00" spellings of the same half-hour', () => {
    // 2026-10-10T23:00Z = 00:00 BST on 11 Oct
    const { map } = buildIntensityMap(national, false);
    const rows = buildFootprintRows(
      [
        {
          interval_start: '2026-10-10T23:00:00+00:00', // PostgREST timestamptz
          interval_end: '2026-10-10T23:30:00+00:00',
          kwh: 0.5,
        },
        {
          interval_start: '2026-10-11T00:00:00+01:00', // Octopus, BST
          interval_end: '2026-10-11T00:30:00+01:00',
          kwh: 0.5,
        },
      ],
      map,
      MPAN,
    );
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.interval_start).toBe('2026-10-10T23:00:00.000Z');
      expect(row.interval_end).toBe('2026-10-10T23:30:00.000Z');
      expect(row.intensity_gco2_kwh).toBe(63);
    }
  });
});

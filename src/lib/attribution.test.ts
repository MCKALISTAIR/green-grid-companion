import { describe, it, expect } from 'vitest';
import { getRegionalHistoryAndForecast, actualSeriesLabel, isEstimatedActual } from './carbonApi';
import { ATTRIBUTION, elexonAttributionStatement, onsPostcodeStatements } from './attribution';
import { vi, afterEach } from 'vitest';

afterEach(() => vi.restoreAllMocks());

describe('attribution', () => {
  it('credits NESO and Open-Meteo under CC BY 4.0', () => {
    expect(ATTRIBUTION.neso.name).toBe('NESO');
    expect(ATTRIBUTION.ccBy4.url).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(ATTRIBUTION.openMeteo.label).toBe('Weather data by Open-Meteo.com');
  });

  it('credits OpenStreetMap (ODbL) and the ONS postcode statements', () => {
    expect(ATTRIBUTION.osm.label).toBe('© OpenStreetMap contributors');
    expect(ATTRIBUTION.osm.url).toBe('https://www.openstreetmap.org/copyright');
    expect(onsPostcodeStatements(2026)).toEqual([
      'Contains OS data © Crown copyright and database right 2026',
      'Contains Royal Mail data © Royal Mail copyright and database right 2026',
      'Source: Office for National Statistics licensed under the Open Government Licence v.3.0',
    ]);
    expect(elexonAttributionStatement(2026)).toContain('Elexon Limited');
  });

  it('marks backfilled regional actuals as GridSense estimates', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            data: [
              { from: '2026-01-01T00:00Z', to: '2026-01-01T00:30Z', intensity: { forecast: 100, index: 'low' }, generationmix: [{ fuel: 'gas', perc: 50 }] },
              { from: '2026-01-01T00:30Z', to: '2026-01-01T01:00Z', intensity: { forecast: 100, actual: 90, index: 'low' } },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    const items = await getRegionalHistoryAndForecast(13, 'x', 'y');
    expect(items[0].intensity.actual).toBe(197); // 50% gas × NESO CCGT 394
    expect(isEstimatedActual(items[0])).toBe(true);
    expect(isEstimatedActual(items[1])).toBe(false);
    expect(actualSeriesLabel(items)).toBe('Estimate');
    expect(actualSeriesLabel([items[1]])).toBe('Actual');
  });
});

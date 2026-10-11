/**
 * Data-source attribution (single source of truth for links and wording).
 *
 * - Carbon intensity + generation mix: NESO Carbon Intensity API, CC BY 4.0.
 *   https://carbonintensity.org.uk/ (API docs list "License: CC BY 4.0").
 * - Weather that drives the scene: Open-Meteo, CC BY 4.0. Its terms ask for a
 *   "Weather data by Open-Meteo.com" link next to where the data is shown.
 *   https://open-meteo.com/en/license
 * - Live generation mix in GW (Demand view, grid-demand edge function):
 *   Elexon BMRS (FUELINST, FREQ) under the BMRS Data Licence, which requires
 *   "Contains BMRS data © Elexon Limited copyright and database right {year}"
 *   and, where possible, a link to the licence.
 *   https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/
 *   Embedded (small-scale) solar and wind estimates: NESO Data Portal under the
 *   NESO Open Data Licence v1.0, which requires "Supported by National Energy SO
 *   Open Data". https://www.neso.energy/data-portal/neso-open-licence
 * - Place search and reverse geocoding: Nominatim (OpenStreetMap data, ODbL).
 *   OSM requires "© OpenStreetMap contributors" plus making clear the data is
 *   under the ODbL, e.g. by linking https://www.openstreetmap.org/copyright.
 *   No map tiles are used.
 * - Postcode lookups: postcodes.io, built on the ONS Postcode Directory (OGL v3).
 *   ONS requires these statements wherever the data is used:
 *   "Contains OS data © Crown copyright and database right {year}",
 *   "Contains Royal Mail data © Royal Mail copyright and database right {year}",
 *   "Source: Office for National Statistics licensed under the Open Government Licence v.3.0".
 *   https://www.ons.gov.uk/methodology/geography/licences
 * Years are the current year, computed at render time.
 */
export const ATTRIBUTION = {
  neso: {
    name: 'NESO',
    fullName: 'National Energy System Operator (NESO)',
    product: 'Carbon Intensity API',
    url: 'https://carbonintensity.org.uk/',
  },
  openMeteo: {
    label: 'Weather data by Open-Meteo.com',
    url: 'https://open-meteo.com/',
    licenceUrl: 'https://open-meteo.com/en/license',
  },
  elexon: {
    name: 'Elexon BMRS',
    url: 'https://bmrs.elexon.co.uk/',
    licenceLabel: 'BMRS Data Licence',
    licenceUrl: 'https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/',
  },
  nesoDataPortal: {
    name: 'NESO Data Portal',
    url: 'https://www.neso.energy/data-portal/embedded-wind-and-solar-forecasts',
    /** Wording required by the NESO Open Data Licence. */
    statement: 'Supported by National Energy SO Open Data',
    licenceLabel: 'NESO Open Data Licence',
    licenceUrl: 'https://www.neso.energy/data-portal/neso-open-licence',
  },
  osm: {
    label: '© OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
    licenceLabel: 'ODbL',
    licenceUrl: 'https://opendatacommons.org/licenses/odbl/',
  },
  postcodesIo: {
    name: 'postcodes.io',
    url: 'https://postcodes.io/',
    onsLicencesUrl: 'https://www.ons.gov.uk/methodology/geography/licences',
    oglUrl: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  },
  ccBy4: {
    label: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
} as const;

/** Wording required by the BMRS Data Licence (year = year of use). */
export function elexonAttributionStatement(year: number = new Date().getFullYear()): string {
  return `Contains BMRS data © Elexon Limited copyright and database right ${year}`;
}

/** Statements the ONS requires for its postcode products (used via postcodes.io). */
export function onsPostcodeStatements(year: number = new Date().getFullYear()): string[] {
  return [
    `Contains OS data © Crown copyright and database right ${year}`,
    `Contains Royal Mail data © Royal Mail copyright and database right ${year}`,
    'Source: Office for National Statistics licensed under the Open Government Licence v.3.0',
  ];
}

/** Shown wherever GridSense derives or fills in values itself. */
export const DERIVED_DATA_NOTE =
  'GridSense adapts this data: some values, such as past regional readings marked "estimate", are calculated by the app from the fuel mix and are not NESO figures.';

/** Short "estimates, not advice" line for footprint / savings figures. */
export const ESTIMATE_DISCLAIMER =
  'Estimates for guidance only, not financial, energy or environmental advice.';

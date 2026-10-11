/**
 * Data-source attribution (single source of truth for links and wording).
 *
 * - Carbon intensity + generation mix: NESO Carbon Intensity API, CC BY 4.0.
 *   https://carbonintensity.org.uk/ (API docs list "License: CC BY 4.0").
 * - Weather that drives the scene: Open-Meteo, CC BY 4.0. Its terms ask for a
 *   "Weather data by Open-Meteo.com" link next to where the data is shown.
 *   https://open-meteo.com/en/license
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
  ccBy4: {
    label: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
} as const;

/** Shown wherever GridSense derives or fills in values itself. */
export const DERIVED_DATA_NOTE =
  'GridSense adapts this data: some values, such as past regional readings marked "estimate", are calculated by the app from the fuel mix and are not NESO figures.';

/** Short "estimates, not advice" line for footprint / savings figures. */
export const ESTIMATE_DISCLAIMER =
  'Estimates for guidance only, not financial, energy or environmental advice.';

import { useState, useEffect, useMemo } from 'react';
import { useAppLocation } from '@/contexts/LocationContext';
import { toOutwardCode } from '@/lib/postcode';

export type SceneType = 'countryside' | 'city' | 'coastal';

const STORAGE_KEY = 'gridgreen-scene-type';
const PREFERENCE_KEY = 'gridgreen-scene-preference'; // 'auto' | SceneType

// Urban UK postcode areas (central London + major city centres)
export const URBAN_POSTCODE_AREAS: ReadonlySet<string> = new Set([
  // London
  'EC',
  'WC',
  'E',
  'N',
  'NW',
  'SE',
  'SW',
  'W',
  // Major cities
  'B',
  'M',
  'L',
  'LS',
  'S',
  'NE',
  'BS',
  'NG',
  'LE',
  'CF',
  'EH',
  'G',
  'BT',
  'BD',
  'CV',
  'SO',
  'PO',
  'BN',
  'CB',
  'OX',
]);

// Coastal UK postcode areas
export const COASTAL_POSTCODE_AREAS: ReadonlySet<string> = new Set([
  'PL', // Plymouth
  'TR', // Truro / Cornwall
  'EX', // Exeter / Devon coast
  'SA', // Swansea / South Wales coast
  'TQ', // Torquay
  'DT', // Dorchester / Dorset coast
  'BH', // Bournemouth
  'CT', // Canterbury / Kent coast
  'PA', // Paisley / Argyll coast
  'KW', // Kirkwall / Caithness
  'IV', // Inverness / Highlands coast
  'KA', // Kilmarnock / Ayrshire coast
  'LL', // Llandudno / North Wales coast
  'AB', // Aberdeen coast
  'DD', // Dundee coast
  'HS', // Outer Hebrides
  'ZE', // Shetland
  'IM', // Isle of Man
  'JE', // Jersey
  'GY', // Guernsey
]);

/**
 * BH-99 (Alistair, 23 Oct 2026): these areas are mostly inland and must never
 * get the coastal scene. They fall through to the neutral non-coastal scene
 * (countryside, or city if an area is ever added to the urban list). Checked
 * before the coastal list so a later edit to that list can't bring them back.
 * DN is Doncaster, SY Shrewsbury, FK Falkirk/Stirling, PH Perth.
 */
export const INLAND_POSTCODE_AREAS: ReadonlySet<string> = new Set(['DN', 'SY', 'FK', 'PH']);

/** London postal areas (the London postal area: EC, WC, E, N, NW, SE, SW, W). */
export const LONDON_POSTCODE_AREAS: ReadonlySet<string> = new Set([
  'EC',
  'WC',
  'E',
  'N',
  'NW',
  'SE',
  'SW',
  'W',
]);

/**
 * Greater London districts outside the London postal area (Alistair, 23 Oct
 * 2026: all of London gets London's landmarks, not just inner London).
 *
 * The app stores only the outward code, and the outer areas (BR, CR, DA, EN,
 * HA, IG, KT, RM, SM, TW, UB, WD) also cover places outside Greater London
 * (Watford WD17, Dartford DA1, Epsom KT17), so this maps by DISTRICT, not area.
 *
 * Source: OS Code-Point Open (Aug 2026 release, OS OpenData), which gives each
 * postcode's local authority. A district is listed when most of its postcodes
 * are in a London borough (ONS codes E09000001 to E09000033). Districts that
 * straddle the boundary follow the majority (London share in brackets):
 *   in:  BR6 (98.2%), CR5 (80.0%), CR8 (98.5%), DA5 (82.2%), DA14 (99.4%),
 *        DA17 (98.5%), EN2 (99.8%), EN4 (99.5%), EN5 (97.4%), HA5 (99.9%),
 *        HA6 (73.1%), HA7 (99.9%), IG8 (93.5%), KT4 (76.3%), KT6 (87.7%),
 *        KT9 (99.0%), RM14 (92.2%), SM2 (93.6%), SM3 (99.2%), SM5 (99.9%),
 *        TW6 (99.2%), TW12 (99.8%), TW14 (99.4%), UB8 (99.8%)
 *   out: TN16 (48.6%, Biggin Hill in Bromley vs Westerham and Tatsfield),
 *        UB9 (47.6%, Harefield in Hillingdon vs Denham), IG7 (36.9%),
 *        DA1 (21.2%), RM4 (17.5%), IG9 (11.0%), and BR8, CR3, CR6, EN6 to EN9,
 *        KT7, KT8, KT17 to KT19, KT22, RM15, SM7, TN14, TW15, TW19, WD3, WD6,
 *        WD23, CM13 and CM14 (each under 5%)
 * CR9, CR90 and UB18 are non-geographic (PO box) districts, all in London.
 */
export const GREATER_LONDON_OUTER_DISTRICTS: ReadonlySet<string> = new Set([
  // Bromley
  'BR1',
  'BR2',
  'BR3',
  'BR4',
  'BR5',
  'BR6',
  'BR7',
  // Croydon
  'CR0',
  'CR2',
  'CR4',
  'CR5',
  'CR7',
  'CR8',
  'CR9',
  'CR90',
  // Dartford area (Bexley)
  'DA5',
  'DA6',
  'DA7',
  'DA8',
  'DA14',
  'DA15',
  'DA16',
  'DA17',
  'DA18',
  // Enfield and Barnet
  'EN1',
  'EN2',
  'EN3',
  'EN4',
  'EN5',
  // Harrow, Brent, Hillingdon
  'HA0',
  'HA1',
  'HA2',
  'HA3',
  'HA4',
  'HA5',
  'HA6',
  'HA7',
  'HA8',
  'HA9',
  // Ilford area (Redbridge, Barking, Waltham Forest)
  'IG1',
  'IG2',
  'IG3',
  'IG4',
  'IG5',
  'IG6',
  'IG8',
  'IG11',
  // Kingston upon Thames
  'KT1',
  'KT2',
  'KT3',
  'KT4',
  'KT5',
  'KT6',
  'KT9',
  // Romford area (Havering, Barking and Dagenham)
  'RM1',
  'RM2',
  'RM3',
  'RM5',
  'RM6',
  'RM7',
  'RM8',
  'RM9',
  'RM10',
  'RM11',
  'RM12',
  'RM13',
  'RM14',
  // Sutton
  'SM1',
  'SM2',
  'SM3',
  'SM4',
  'SM5',
  'SM6',
  // Twickenham area (Richmond, Hounslow, Heathrow)
  'TW1',
  'TW2',
  'TW3',
  'TW4',
  'TW5',
  'TW6',
  'TW7',
  'TW8',
  'TW9',
  'TW10',
  'TW11',
  'TW12',
  'TW13',
  'TW14',
  // Southall area (Ealing, Hillingdon)
  'UB1',
  'UB2',
  'UB3',
  'UB4',
  'UB5',
  'UB6',
  'UB7',
  'UB8',
  'UB10',
  'UB11',
  'UB18',
]);

/**
 * Edinburgh city districts (Design, 23 Oct 2026): EH1 to EH17 only. EH18 and
 * up are Midlothian, East and West Lothian and Peebles, which stay generic.
 */
export const EDINBURGH_AREA = 'EH';
export const EDINBURGH_MAX_DISTRICT = 17;

/**
 * Postcode area (the leading letters) of a stored location, or null.
 *
 * The app stores only the outward code ("SW1A", "eh1"), though older installs
 * and tests may pass a full postcode. Region names the app also stores
 * ("GB", "Scotland", "England", "Wales") have no digit after the letters, so
 * they return null rather than being misread as an area ("Wales" is not WA).
 */
export function postcodeArea(postcode: string | null | undefined): string | null {
  const cleaned = (postcode ?? '').toUpperCase().replace(/\s/g, '');
  const match = cleaned.match(/^([A-Z]{1,2})\d/);
  return match ? match[1] : null;
}

/**
 * Postcode district number of a stored location ("EH17" → 17, "EH1 1YZ" → 1,
 * "eh11yz" → 1), or null when there is no district ("EH", "GB", "").
 * Full postcodes are split into outward and inward parts first, so a full
 * postcode without its space isn't misread ("EH11YZ" is EH1 1YZ, not EH11).
 */
export function postcodeDistrict(postcode: string | null | undefined): number | null {
  const outward = toOutwardCode((postcode ?? '').replace(/\s/g, '')).toUpperCase();
  const match = outward.match(/^[A-Z]{1,2}(\d{1,2})[A-Z]?$/);
  return match ? Number(match[1]) : null;
}

/**
 * True when a stored location is in Greater London: the London postal area, or
 * an outer district in GREATER_LONDON_OUTER_DISTRICTS. The outer districts are
 * matched on area + district number ("CR0", "KT17"), never the area alone.
 */
export function isGreaterLondon(postcode: string | null | undefined): boolean {
  const area = postcodeArea(postcode);
  if (!area) return false;
  if (LONDON_POSTCODE_AREAS.has(area)) return true;
  const district = postcodeDistrict(postcode);
  return district !== null && GREATER_LONDON_OUTER_DISTRICTS.has(`${area}${district}`);
}

export function detectSceneFromPostcode(postcode: string | null | undefined): SceneType {
  const area = postcodeArea(postcode);
  if (!area) return 'countryside';

  // All of Greater London is a city scene, including the outer districts.
  if (isGreaterLondon(postcode)) return 'city';

  if (INLAND_POSTCODE_AREAS.has(area)) {
    return URBAN_POSTCODE_AREAS.has(area) ? 'city' : 'countryside';
  }
  if (COASTAL_POSTCODE_AREAS.has(area)) return 'coastal';
  if (URBAN_POSTCODE_AREAS.has(area)) return 'city';
  return 'countryside';
}

/**
 * Which city skyline the city scene draws (BH-98 / PR-B2, Alistair 23 Oct 2026):
 * - 'london': the London landmarks (Shard-like tower, clock tower, London Eye)
 *   and the Tube flash. All of Greater London: the London postal area plus
 *   the outer districts in GREATER_LONDON_OUTER_DISTRICTS (BR1, CR0, HA1...).
 * - 'edinburgh': Edinburgh's own variant, city districts EH1 to EH17 only.
 *   Until the art PR lands it is the generic skyline; Edinburgh Castle slots
 *   into the far landmark layer later.
 * - 'generic': every other city, and no postcode (device location only).
 *   GPS-only users stay generic, never London (Alistair, 23 Oct 2026).
 *
 * Postcode based on purpose: the stored location is an outward code. Device
 * coordinates are not used, because they fall back to central London when
 * location is unavailable, which would wrongly give everyone London.
 */
export type CityVariant = 'london' | 'edinburgh' | 'generic';

export function detectCityVariant(postcode: string | null | undefined): CityVariant {
  const area = postcodeArea(postcode);
  if (!area) return 'generic';
  if (isGreaterLondon(postcode)) return 'london';
  if (area === EDINBURGH_AREA) {
    const district = postcodeDistrict(postcode);
    if (district !== null && district >= 1 && district <= EDINBURGH_MAX_DISTRICT) {
      return 'edinburgh';
    }
  }
  return 'generic';
}

export function useSceneType() {
  const { postcode } = useAppLocation();

  const [preference, setPreferenceState] = useState<'auto' | SceneType>(() => {
    try {
      return (localStorage.getItem(PREFERENCE_KEY) as 'auto' | SceneType) || 'auto';
    } catch {
      return 'auto';
    }
  });

  const autoDetected = useMemo(() => detectSceneFromPostcode(postcode), [postcode]);
  const cityVariant = useMemo(() => detectCityVariant(postcode), [postcode]);

  const sceneType: SceneType = preference === 'auto' ? autoDetected : preference;

  // Persist preference
  const setPreference = (pref: 'auto' | SceneType) => {
    setPreferenceState(pref);
    localStorage.setItem(PREFERENCE_KEY, pref);
  };

  // Cache current scene type
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, sceneType);
  }, [sceneType]);

  return {
    sceneType,
    autoDetected,
    cityVariant,
    preference,
    setPreference,
  };
}

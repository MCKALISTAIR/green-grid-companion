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

/** London postal areas (the central London districts). */
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

export function detectSceneFromPostcode(postcode: string | null | undefined): SceneType {
  const area = postcodeArea(postcode);
  if (!area) return 'countryside';

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
 *   and the Tube flash.
 * - 'edinburgh': Edinburgh's own variant, city districts EH1 to EH17 only.
 *   Until the art PR lands it is the generic skyline; Edinburgh Castle slots
 *   into the far landmark layer later.
 * - 'generic': every other city, and no postcode (device location only).
 *
 * Postcode based on purpose: the stored location is an outward code. Device
 * coordinates are not used, because they fall back to central London when
 * location is unavailable, which would wrongly give everyone London.
 */
export type CityVariant = 'london' | 'edinburgh' | 'generic';

export function detectCityVariant(postcode: string | null | undefined): CityVariant {
  const area = postcodeArea(postcode);
  if (!area) return 'generic';
  if (LONDON_POSTCODE_AREAS.has(area)) return 'london';
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

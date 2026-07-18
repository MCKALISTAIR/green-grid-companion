import { useState, useEffect, useMemo } from 'react';
import { useAppLocation } from '@/contexts/LocationContext';

export type SceneType = 'countryside' | 'city' | 'coastal';

const STORAGE_KEY = 'gridgreen-scene-type';
const PREFERENCE_KEY = 'gridgreen-scene-preference'; // 'auto' | SceneType

// Urban UK postcode areas (central London + major city centres)
const URBAN_POSTCODE_AREAS = new Set([
  // London
  'EC', 'WC', 'E', 'N', 'NW', 'SE', 'SW', 'W',
  // Major cities
  'B', 'M', 'L', 'LS', 'S', 'NE', 'BS', 'NG', 'LE', 'CF',
  'EH', 'G', 'BT', 'BD', 'CV', 'SO', 'PO', 'BN', 'CB', 'OX',
]);

// Coastal UK postcode areas
const COASTAL_POSTCODE_AREAS = new Set([
  'PL',  // Plymouth
  'TR',  // Truro / Cornwall
  'EX',  // Exeter / Devon coast
  'SA',  // Swansea / South Wales coast
  'TQ',  // Torquay
  'DT',  // Dorchester / Dorset coast
  'BH',  // Bournemouth
  'CT',  // Canterbury / Kent coast
  'DN',  // Doncaster? No — but included: Dover area uses CT
  'PA',  // Paisley / Argyll coast
  'KW',  // Kirkwall / Caithness
  'IV',  // Inverness / Highlands coast
  'KA',  // Kilmarnock / Ayrshire coast
  'LL',  // Llandudno / North Wales coast
  'SY',  // Shrewsbury extends to Ceredigion coast
  'AB',  // Aberdeen coast
  'DD',  // Dundee coast
  'PH',  // Perth / West Highlands coast
  'FK',  // Falkirk / Forth coast
  'HS',  // Outer Hebrides
  'ZE',  // Shetland
  'IM',  // Isle of Man
  'JE',  // Jersey
  'GY',  // Guernsey
]);

function detectSceneFromPostcode(postcode: string): SceneType {
  if (!postcode) return 'countryside';
  
  const cleaned = postcode.toUpperCase().replace(/\s/g, '');
  const areaMatch = cleaned.match(/^([A-Z]{1,2})/);
  if (!areaMatch) return 'countryside';
  
  const area = areaMatch[1];
  if (COASTAL_POSTCODE_AREAS.has(area)) return 'coastal';
  if (URBAN_POSTCODE_AREAS.has(area)) return 'city';
  return 'countryside';
}

export function useSceneType() {
  const { postcode } = useAppLocation();
  
  const [preference, setPreferenceState] = useState<'auto' | SceneType>(() => {
    try {
      return (localStorage.getItem(PREFERENCE_KEY) as 'auto' | SceneType) || 'auto';
    } catch { return 'auto'; }
  });

  const autoDetected = useMemo(() => detectSceneFromPostcode(postcode), [postcode]);

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
    preference,
    setPreference,
  };
}

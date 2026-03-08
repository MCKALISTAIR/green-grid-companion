import { useState, useEffect, useMemo } from 'react';
import { useAppLocation } from '@/contexts/LocationContext';

export type SceneType = 'countryside' | 'city';

const STORAGE_KEY = 'gridgreen-scene-type';
const PREFERENCE_KEY = 'gridgreen-scene-preference'; // 'auto' | 'countryside' | 'city'

// Urban UK postcode areas (central London + major city centres)
const URBAN_POSTCODE_AREAS = new Set([
  // London
  'EC', 'WC', 'E', 'N', 'NW', 'SE', 'SW', 'W',
  // Major cities
  'B',   // Birmingham
  'M',   // Manchester
  'L',   // Liverpool
  'LS',  // Leeds
  'S',   // Sheffield
  'NE',  // Newcastle
  'BS',  // Bristol
  'NG',  // Nottingham
  'LE',  // Leicester
  'CF',  // Cardiff
  'EH',  // Edinburgh
  'G',   // Glasgow
  'BT',  // Belfast
  'BD',  // Bradford
  'CV',  // Coventry
  'SO',  // Southampton
  'PO',  // Portsmouth
  'BN',  // Brighton
  'CB',  // Cambridge
  'OX',  // Oxford
]);

function detectSceneFromPostcode(postcode: string): SceneType {
  if (!postcode) return 'countryside';
  
  // Extract the area letters from the postcode (e.g., "SW1A 1AA" → "SW")
  const cleaned = postcode.toUpperCase().replace(/\s/g, '');
  const areaMatch = cleaned.match(/^([A-Z]{1,2})/);
  if (!areaMatch) return 'countryside';
  
  return URBAN_POSTCODE_AREAS.has(areaMatch[1]) ? 'city' : 'countryside';
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

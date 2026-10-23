import type { TimeOfDay } from '@/hooks/useTimeOfDay';

/**
 * Countryside land tokens: hills (back, mid, front) and trees.
 *
 * Design brief Q5, decision 12 ("grass never reacts to carbon"): land, trees,
 * ground and sea colours depend only on time, weather and snow. Carbon shows
 * only as haze and gas-plant smoke (PR-2b), never as brown or dead grass. So
 * this takes no carbon input at all. The values are the former "clean" set.
 */
export interface LandPalette {
  backHillHighlight: string;
  backHillShadow: string;
  midHillHighlight: string;
  midHillShadow: string;
  frontHillHighlight: string;
  frontHillShadow: string;
  treePrimary: string;
  treeShadow: string;
}

export interface LandPaletteInput {
  isNight: boolean;
  synthwaveMode: boolean;
  isSnowing?: boolean;
  timeOfDay?: TimeOfDay;
}

export function getLandPalette({
  isNight,
  synthwaveMode,
  isSnowing,
  timeOfDay,
}: LandPaletteInput): LandPalette {
  if (synthwaveMode) {
    return {
      backHillHighlight: '#3c096c',
      backHillShadow: '#1a0033',
      midHillHighlight: '#5a189a',
      midHillShadow: '#240046',
      frontHillHighlight: '#7b2cbf',
      frontHillShadow: '#3c096c',
      treePrimary: '#e0aaff',
      treeShadow: '#9d4edd',
    };
  }
  if (isSnowing) {
    return {
      backHillHighlight: isNight ? '#2d3748' : '#e2e8f0',
      backHillShadow: isNight ? '#0f172a' : '#cbd5e1',
      midHillHighlight: isNight ? '#334155' : '#f1f5f9',
      midHillShadow: isNight ? '#1e293b' : '#e2e8f0',
      frontHillHighlight: isNight ? '#475569' : '#ffffff',
      frontHillShadow: isNight ? '#334155' : '#f1f5f9',
      treePrimary: isNight ? '#0f172a' : '#14532d',
      treeShadow: isNight ? '#020617' : '#052e16',
    };
  }
  if (isNight) {
    return {
      backHillHighlight: '#1e293b',
      backHillShadow: '#020617',
      midHillHighlight: '#334155',
      midHillShadow: '#0f172a',
      frontHillHighlight: '#475569',
      frontHillShadow: '#1e293b',
      treePrimary: '#475569',
      treeShadow: '#0f172a',
    };
  }

  // Time-of-day tinting for landscape
  if (timeOfDay === 'dawn') {
    return {
      backHillHighlight: '#2b5a3e',
      backHillShadow: '#13281a',
      midHillHighlight: '#34704b',
      midHillShadow: '#1a3d25',
      frontHillHighlight: '#3e8c5b',
      frontHillShadow: '#204d30',
      treePrimary: '#6ec89b',
      treeShadow: '#3a8a65',
    };
  }
  if (timeOfDay === 'sunset') {
    return {
      backHillHighlight: '#4a702e',
      backHillShadow: '#203610',
      midHillHighlight: '#5c8a39',
      midHillShadow: '#2a4714',
      frontHillHighlight: '#70a644',
      frontHillShadow: '#365a18',
      treePrimary: '#8bc34a',
      treeShadow: '#558b2f',
    };
  }
  if (timeOfDay === 'dusk') {
    return {
      backHillHighlight: '#25354c',
      backHillShadow: '#0f1824',
      midHillHighlight: '#324a6b',
      midHillShadow: '#172538',
      frontHillHighlight: '#44608c',
      frontHillShadow: '#21334c',
      treePrimary: '#5a7a90',
      treeShadow: '#2a4a60',
    };
  }

  // Midday / Normal daylight
  return {
    backHillHighlight: '#1f6e3c',
    backHillShadow: '#0e3a1d',
    midHillHighlight: '#22c55e',
    midHillShadow: '#14532d',
    frontHillHighlight: '#4ade80',
    frontHillShadow: '#16a34a',
    treePrimary: '#4ade80',
    treeShadow: '#16a34a',
  };
}

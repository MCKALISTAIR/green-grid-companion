import { registerPlugin } from '@capacitor/core';
import { logger } from './logger';

export interface SharedPrefsPlugin {
  setRegion(options: { regionId: string }): Promise<{ success: boolean; regionId: string }>;
}

const SharedPrefs = registerPlugin<SharedPrefsPlugin>('SharedPrefs');

export const setGenericSharedRegion = async (regionId: string) => {
  try {
    await SharedPrefs.setRegion({ regionId });
    logger.debug('Widget region preference updated', { regionId });
  } catch (error) {
    // This will fail in browser or if plugin not registered, which is fine for dev
    logger.warn('Failed to set widget region preference', { error });
  }
};

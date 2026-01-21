import { registerPlugin } from '@capacitor/core';

export interface SharedPrefsPlugin {
    setRegion(options: { regionId: string }): Promise<{ success: boolean; regionId: string }>;
}

const SharedPrefs = registerPlugin<SharedPrefsPlugin>('SharedPrefs');

export const setGenericSharedRegion = async (regionId: string) => {
    try {
        await SharedPrefs.setRegion({ regionId });
        console.log(`SharedPrefs: Region set to ${regionId}`);
    } catch (error) {
        // This will fail in browser or if plugin not registered, which is fine for dev
        console.warn('SharedPrefs: Failed to set region (native plugin might be missing)', error);
    }
};

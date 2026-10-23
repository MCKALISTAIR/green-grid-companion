import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TimeOfDay } from './useTimeOfDay';

export interface SceneOverrides {
  weather?: {
    isRaining?: boolean;
    isSnowing?: boolean;
    isThunderstorm?: boolean;
    isFoggy?: boolean;
    cloudCover?: number;
    windSpeed?: number;
  };
  timeOfDay?: TimeOfDay;
  intensity?: number; // 0-500
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  sceneType?: 'countryside' | 'city' | 'coastal';
  elements?: {
    showUFO?: boolean;
    showTrain?: boolean;
    showDrone?: boolean;
  };
}

const STORAGE_KEY = 'gridgreen-director-mode';

/**
 * The Director Mode state. Call this once, in SceneDirectorProvider; everything
 * else reads the shared value with useSceneDirector().
 */
export function useSceneDirectorState() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).unlocked : false;
    } catch {
      return false;
    }
  });

  const [active, setActive] = useState(false); // Enable/Disable overrides

  const [overrides, setOverrides] = useState<SceneOverrides>({});

  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked }));
  }, [unlocked]);

  const handleVersionTap = useCallback(() => {
    if (unlocked) return;

    setTapCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 7) {
        setUnlocked(true);
        return 0; // Reset
      }
      return newCount;
    });
  }, [unlocked]);

  const updateOverride = useCallback(
    (key: keyof SceneOverrides, value: Record<string, unknown>) => {
      setOverrides((prev) => {
        const currentValue = prev[key];
        const isObject =
          currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue);
        return {
          ...prev,
          [key]: isObject ? { ...(currentValue as Record<string, unknown>), ...value } : value,
        };
      });
    },
    [],
  );

  const setExactOverride = useCallback(
    (key: keyof SceneOverrides, value: SceneOverrides[typeof key]) => {
      setOverrides((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const clearOverrides = useCallback(() => {
    setOverrides({});
  }, []);

  return {
    unlocked,
    active,
    overrides,
    tapCount,
    setActive,
    handleVersionTap,
    updateOverride,
    setExactOverride,
    clearOverrides,
  };
}

export type SceneDirectorValue = ReturnType<typeof useSceneDirectorState>;

const noop = () => {};

/** Outside a provider (unit tests, isolated renders): Director Mode is off. */
const INACTIVE_DIRECTOR: SceneDirectorValue = {
  unlocked: false,
  active: false,
  overrides: {},
  tapCount: 0,
  setActive: noop,
  handleVersionTap: noop,
  updateOverride: noop,
  setExactOverride: noop,
  clearOverrides: noop,
};

export const SceneDirectorContext = createContext<SceneDirectorValue | null>(null);

/**
 * Shared Director Mode state (BH-94 QA tooling). It used to be per-instance
 * useState, so DirectorPanel's overrides never reached IntensityScene, the
 * status bar or Settings. Now every caller reads the one provider.
 */
export function useSceneDirector(): SceneDirectorValue {
  return useContext(SceneDirectorContext) ?? INACTIVE_DIRECTOR;
}


import { useState, useEffect, useCallback } from 'react';
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
    elements?: {
        showUFO?: boolean;
        showTrain?: boolean;
        showDrone?: boolean;
    };
}

const STORAGE_KEY = 'gridgreen-director-mode';

export function useSceneDirector() {
    const [unlocked, setUnlocked] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved).unlocked : false;
        } catch { return false; }
    });

    const [active, setActive] = useState(false); // Enable/Disable overrides

    const [overrides, setOverrides] = useState<SceneOverrides>({});

    const [tapCount, setTapCount] = useState(0);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked }));
    }, [unlocked]);

    const handleVersionTap = useCallback(() => {
        if (unlocked) return;

        setTapCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 7) {
                setUnlocked(true);
                return 0; // Reset
            }
            return newCount;
        });
    }, [unlocked]);

    const updateOverride = useCallback((key: keyof SceneOverrides, value: any) => {
        setOverrides(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                ...value
            }
        }));
    }, []);

    const setExactOverride = useCallback((key: keyof SceneOverrides, value: any) => {
        setOverrides(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

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
        clearOverrides
    };
}

import { useState, useEffect } from 'react';
import { HouseType, DEFAULT_HOUSE_TYPE } from '@/lib/energy-standards';

const SETTINGS_KEY = 'grid-companion-settings';

interface Settings {
    houseType: HouseType;
    customAnnualKwh: number;
}

const DEFAULT_SETTINGS: Settings = {
    houseType: DEFAULT_HOUSE_TYPE,
    customAnnualKwh: 2900,
};

export function useSettings() {
    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Failed to parse settings:', error);
            return DEFAULT_SETTINGS;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }, [settings]);

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    return {
        settings,
        updateSetting,
        // Convenience accessors
        houseType: settings.houseType,
        setHouseType: (type: HouseType) => updateSetting('houseType', type),
        customAnnualKwh: settings.customAnnualKwh,
        setCustomAnnualKwh: (kwh: number) => updateSetting('customAnnualKwh', kwh),
    };
}

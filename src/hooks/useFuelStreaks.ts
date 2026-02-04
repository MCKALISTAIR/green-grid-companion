import { useEffect, useState, useCallback } from 'react';
import { MixItem } from '@/components/GenerationMixBar';

const STORAGE_KEY = 'fuel-streaks-v2';
const RECORDS_KEY = 'fuel-streak-records';

// Fossil fuels we want to track "free" streaks for
const FOSSIL_FUELS = ['coal', 'gas', 'oil'];

// Renewables we want to track "high" celebrations for
const RENEWABLES = ['wind', 'solar', 'hydro'];

export interface FuelStreakData {
    fuel: string;
    lastSeen: string | null; // ISO timestamp when last at > 0%
    streakStarted: string | null; // When the current streak started
    currentPerc: number;
}

export interface FuelRecord {
    fuel: string;
    previousRecord: number; // days
    newRecord: number; // days
    achievedAt: string; // ISO timestamp
    celebrated: boolean;
}

export interface FuelStreak {
    fuel: string;
    days: number;
    hours: number;
    isActive: boolean; // Currently at 0%
    isNewRecord: boolean;
    previousRecord?: number;
}

interface FuelStreaksState {
    streaks: Record<string, FuelStreakData>;
    records: Record<string, FuelRecord>;
}

export function useFuelStreaks(mix: MixItem[]) {
    const [streaks, setStreaks] = useState<FuelStreak[]>([]);
    const [newRecords, setNewRecords] = useState<FuelRecord[]>([]);

    const dismissRecord = useCallback((fuel: string) => {
        const stored = localStorage.getItem(RECORDS_KEY);
        if (stored) {
            const records: Record<string, FuelRecord> = JSON.parse(stored);
            if (records[fuel]) {
                records[fuel].celebrated = true;
                localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
                setNewRecords(prev => prev.filter(r => r.fuel !== fuel));
            }
        }
    }, []);

    useEffect(() => {
        if (!mix || mix.length === 0) return;

        const now = new Date().toISOString();

        // Load existing data
        const storedStreaks = localStorage.getItem(STORAGE_KEY);
        const storedRecords = localStorage.getItem(RECORDS_KEY);

        let streakData: Record<string, FuelStreakData> = storedStreaks
            ? JSON.parse(storedStreaks)
            : {};

        let recordData: Record<string, FuelRecord> = storedRecords
            ? JSON.parse(storedRecords)
            : {};

        // Initialize any missing fuels
        for (const fuel of FOSSIL_FUELS) {
            if (!streakData[fuel]) {
                streakData[fuel] = {
                    fuel,
                    lastSeen: null,
                    streakStarted: null,
                    currentPerc: 0
                };
            }
        }

        // Update each fossil fuel's streak
        const updatedStreaks: FuelStreak[] = [];
        const updatedRecords: FuelRecord[] = [];

        for (const fuel of FOSSIL_FUELS) {
            const mixItem = mix.find(m => m.fuel.toLowerCase() === fuel);
            const currentPerc = mixItem?.perc || 0;

            streakData[fuel].currentPerc = currentPerc;

            if (currentPerc === 0) {
                // Fuel not being used!
                if (!streakData[fuel].streakStarted) {
                    // Start a new streak
                    streakData[fuel].streakStarted = now;
                }
            } else {
                // Fuel is being used, reset streak
                streakData[fuel].lastSeen = now;
                streakData[fuel].streakStarted = null;
            }

            // Calculate current streak
            if (streakData[fuel].streakStarted && currentPerc === 0) {
                const start = new Date(streakData[fuel].streakStarted!);
                const current = new Date();
                const diffMs = current.getTime() - start.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                const days = Math.floor(diffHours / 24);
                const hours = Math.floor(diffHours % 24);

                // Check for record
                const existingRecord = recordData[fuel];
                const previousRecordDays = existingRecord?.newRecord || 0;
                const isNewRecord = days > previousRecordDays && days > 0;

                if (isNewRecord) {
                    recordData[fuel] = {
                        fuel,
                        previousRecord: previousRecordDays,
                        newRecord: days,
                        achievedAt: now,
                        celebrated: false
                    };
                }

                updatedStreaks.push({
                    fuel,
                    days,
                    hours,
                    isActive: true,
                    isNewRecord,
                    previousRecord: previousRecordDays
                });

                // Check if we should show celebration
                if (recordData[fuel] && !recordData[fuel].celebrated && recordData[fuel].newRecord > 0) {
                    updatedRecords.push(recordData[fuel]);
                }
            } else {
                updatedStreaks.push({
                    fuel,
                    days: 0,
                    hours: 0,
                    isActive: false,
                    isNewRecord: false
                });
            }
        }

        // Save updated data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(streakData));
        localStorage.setItem(RECORDS_KEY, JSON.stringify(recordData));

        setStreaks(updatedStreaks);
        setNewRecords(updatedRecords);
    }, [mix]);

    return { streaks, newRecords, dismissRecord };
}

// Format streak for display
export function formatStreakDuration(days: number, hours: number): string {
    if (days === 0 && hours === 0) return 'Just now';
    if (days === 0) return `${hours}h`;
    if (hours === 0) return `${days}d`;
    return `${days}d ${hours}h`;
}

// Get a celebratory message for record-breaking streaks
export function getRecordMessage(fuel: string, days: number, previousRecord: number): string {
    const fuelName = fuel.charAt(0).toUpperCase() + fuel.slice(1);

    if (previousRecord === 0) {
        return `🎉 First ${fuelName}-free day recorded!`;
    }

    const improvement = days - previousRecord;
    if (improvement === 1) {
        return `🏆 New record! ${days} days without ${fuelName} - beating the previous record by 1 day!`;
    }

    return `🏆 New record! ${days} days without ${fuelName} - ${improvement} days longer than before!`;
}

import { useEffect, useState, useCallback } from 'react';
import { MixItem } from '@/components/GenerationMixBar';
import { getGenerationMix, GenerationMix } from '@/lib/carbonApi';

const STORAGE_KEY = 'fuel-streaks-v3';
const RECORDS_KEY = 'fuel-streak-records-v2';
const LAST_SEEN_KEY = 'fuel-last-seen-v1';

// Fossil fuels we want to track "free" streaks for
const FOSSIL_FUELS = ['coal', 'gas', 'oil'];

// API endpoint for historical generation data
const CARBON_API_BASE = 'https://api.carbonintensity.org.uk';

export interface FuelStreakData {
    fuel: string;
    lastSeen: string | null; // ISO timestamp when last at > 0%
    streakStarted: string | null; // When the current streak started
    currentPerc: number;
    verifiedHistorically: boolean; // Whether we've verified via API
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
    isVerified: boolean; // Has historical verification
}

interface StoredLastSeen {
    [fuel: string]: string | null; // ISO timestamp
}

// Fetch historical generation mix to find when a fuel was last used
async function fetchLastSeenFromHistory(fuel: string): Promise<string | null> {
    try {
        // Check the last 14 days of data (API allows up to 30 days)
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 14);

        const fromStr = from.toISOString();
        const toStr = to.toISOString();

        const response = await fetch(
            `${CARBON_API_BASE}/generation/${fromStr}/${toStr}`
        );

        if (!response.ok) {
            console.warn(`Failed to fetch historical generation: ${response.status}`);
            return null;
        }

        const json = await response.json();
        const data = json.data || [];

        // Iterate backwards through history to find when fuel was last used
        for (let i = data.length - 1; i >= 0; i--) {
            const entry = data[i];
            const mix: GenerationMix[] = entry.generationmix || [];
            const fuelEntry = mix.find(m => m.fuel.toLowerCase() === fuel);

            if (fuelEntry && fuelEntry.perc > 0) {
                // Found when it was last used
                return entry.to || entry.from;
            }
        }

        // If we didn't find it in 14 days, it's been at least 14 days
        // Return the start of our search window as a conservative estimate
        return null; // Will indicate "at least 14 days"
    } catch (error) {
        console.warn('Error fetching historical generation:', error);
        return null;
    }
}

export function useFuelStreaks(mix: MixItem[]) {
    const [streaks, setStreaks] = useState<FuelStreak[]>([]);
    const [newRecords, setNewRecords] = useState<FuelRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

        const processStreaks = async () => {
            const now = new Date();
            const nowStr = now.toISOString();

            // Load existing data
            const storedStreaks = localStorage.getItem(STORAGE_KEY);
            const storedRecords = localStorage.getItem(RECORDS_KEY);
            const storedLastSeen = localStorage.getItem(LAST_SEEN_KEY);

            let streakData: Record<string, FuelStreakData> = storedStreaks
                ? JSON.parse(storedStreaks)
                : {};

            let recordData: Record<string, FuelRecord> = storedRecords
                ? JSON.parse(storedRecords)
                : {};

            let lastSeenData: StoredLastSeen = storedLastSeen
                ? JSON.parse(storedLastSeen)
                : {};

            const updatedStreaks: FuelStreak[] = [];
            const updatedRecords: FuelRecord[] = [];

            for (const fuel of FOSSIL_FUELS) {
                const mixItem = mix.find(m => m.fuel.toLowerCase() === fuel);
                const currentPerc = mixItem?.perc || 0;

                // Initialize if missing
                if (!streakData[fuel]) {
                    streakData[fuel] = {
                        fuel,
                        lastSeen: null,
                        streakStarted: null,
                        currentPerc: 0,
                        verifiedHistorically: false
                    };
                }

                streakData[fuel].currentPerc = currentPerc;

                if (currentPerc > 0) {
                    // Fuel is being used, update last seen and reset streak
                    streakData[fuel].lastSeen = nowStr;
                    streakData[fuel].streakStarted = null;
                    streakData[fuel].verifiedHistorically = true;
                    lastSeenData[fuel] = nowStr;

                    updatedStreaks.push({
                        fuel,
                        days: 0,
                        hours: 0,
                        isActive: false,
                        isNewRecord: false,
                        isVerified: true
                    });
                } else {
                    // Fuel not being used - need to find when it was last used
                    let lastSeenTime: Date | null = null;
                    let isVerified = streakData[fuel].verifiedHistorically;

                    // Check if we have cached lastSeen
                    if (lastSeenData[fuel]) {
                        lastSeenTime = new Date(lastSeenData[fuel]!);
                        isVerified = true;
                    } else if (!streakData[fuel].verifiedHistorically) {
                        // Need to fetch historical data
                        const historicalLastSeen = await fetchLastSeenFromHistory(fuel);

                        if (historicalLastSeen) {
                            lastSeenTime = new Date(historicalLastSeen);
                            lastSeenData[fuel] = historicalLastSeen;
                            streakData[fuel].lastSeen = historicalLastSeen;
                            streakData[fuel].streakStarted = historicalLastSeen;
                            isVerified = true;
                        } else {
                            // Not found in 14 days - use 14 days as minimum
                            const fourteenDaysAgo = new Date();
                            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
                            lastSeenTime = fourteenDaysAgo;
                            lastSeenData[fuel] = fourteenDaysAgo.toISOString();
                            streakData[fuel].streakStarted = fourteenDaysAgo.toISOString();
                            isVerified = true; // We verified it's been at least 14 days
                        }

                        streakData[fuel].verifiedHistorically = true;
                    } else if (streakData[fuel].lastSeen) {
                        lastSeenTime = new Date(streakData[fuel].lastSeen!);
                    }

                    // Calculate streak duration
                    if (lastSeenTime) {
                        const diffMs = now.getTime() - lastSeenTime.getTime();
                        const diffHours = diffMs / (1000 * 60 * 60);
                        const days = Math.floor(diffHours / 24);
                        const hours = Math.floor(diffHours % 24);

                        // Only show if at least 1 day
                        if (days >= 1) {
                            // Check for record
                            const existingRecord = recordData[fuel];
                            const previousRecordDays = existingRecord?.newRecord || 0;
                            const isNewRecord = days > previousRecordDays && days > 1;

                            if (isNewRecord) {
                                recordData[fuel] = {
                                    fuel,
                                    previousRecord: previousRecordDays,
                                    newRecord: days,
                                    achievedAt: nowStr,
                                    celebrated: false
                                };
                            }

                            updatedStreaks.push({
                                fuel,
                                days,
                                hours,
                                isActive: true,
                                isNewRecord,
                                previousRecord: previousRecordDays,
                                isVerified
                            });

                            // Check if we should show celebration
                            if (recordData[fuel] && !recordData[fuel].celebrated && recordData[fuel].newRecord > 1) {
                                updatedRecords.push(recordData[fuel]);
                            }
                        } else {
                            // Less than a day - don't show
                            updatedStreaks.push({
                                fuel,
                                days: 0,
                                hours,
                                isActive: false,
                                isNewRecord: false,
                                isVerified
                            });
                        }
                    } else {
                        updatedStreaks.push({
                            fuel,
                            days: 0,
                            hours: 0,
                            isActive: false,
                            isNewRecord: false,
                            isVerified: false
                        });
                    }
                }
            }

            // Save updated data
            localStorage.setItem(STORAGE_KEY, JSON.stringify(streakData));
            localStorage.setItem(RECORDS_KEY, JSON.stringify(recordData));
            localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(lastSeenData));

            setStreaks(updatedStreaks);
            setNewRecords(updatedRecords);
            setIsLoading(false);
        };

        processStreaks();
    }, [mix]);

    return { streaks, newRecords, dismissRecord, isLoading };
}

// Format streak for display
export function formatStreakDuration(days: number, hours: number): string {
    if (days === 0) return '';
    if (days === 1) return '1 day';
    return `${days} days`;
}

// Get a celebratory message for record-breaking streaks
export function getRecordMessage(fuel: string, days: number, previousRecord: number): string {
    const fuelName = fuel.charAt(0).toUpperCase() + fuel.slice(1);

    if (previousRecord === 0) {
        return `🎉 First ${fuelName}-free milestone recorded!`;
    }

    const improvement = days - previousRecord;
    if (improvement === 1) {
        return `🏆 New record! ${days} days without ${fuelName} - beating the previous record by 1 day!`;
    }

    return `🏆 New record! ${days} days without ${fuelName} - ${improvement} days longer than before!`;
}

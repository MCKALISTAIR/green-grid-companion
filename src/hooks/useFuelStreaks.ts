import { useEffect, useState, useCallback } from 'react';
import { MixItem } from '@/lib/generationUtils';
import { getGenerationMix, GenerationMix } from '@/lib/carbonApi';

const STORAGE_KEY = 'fuel-streaks-v3';
const RECORDS_KEY = 'fuel-streak-records-v2';
const LAST_SEEN_KEY = 'fuel-last-seen-v1';

// Fossil fuels we want to track "free" streaks for
// Note: Oil removed as UK grid hasn't used it for generation in years
const FOSSIL_FUELS = ['coal', 'gas'];

// API endpoint for historical generation data
const CARBON_API_BASE = 'https://api.carbonintensity.org.uk';

export interface FuelStreakData {
  fuel: string;
  lastSeen: string | null; // ISO timestamp when last at > 0%
  streakStarted: string | null; // When the current streak started
  currentPerc: number;
  verifiedHistorically: boolean; // Whether we've verified via API
  exceededLookback?: boolean; // True if fuel wasn't found in max lookback period
}

export interface FuelRecord {
  fuel: string;
  previousRecord: number; // days
  newRecord: number; // days
  achievedAt: string; // ISO timestamp
  celebrated: boolean;
  exceededLookback?: boolean; // True if the streak exceeds API lookback limit
}

export interface FuelStreak {
  fuel: string;
  days: number;
  hours: number;
  isActive: boolean; // Currently at 0%
  isNewRecord: boolean;
  previousRecord?: number;
  isVerified: boolean; // Has historical verification
  exceededLookback?: boolean; // True if the streak is "30+ days"
}

interface StoredLastSeen {
  [fuel: string]: string | null; // ISO timestamp
}

// Maximum days the Carbon Intensity API allows for historical queries
const MAX_LOOKBACK_DAYS = 30;

// Fetch historical generation mix to find when a fuel was last used
async function fetchLastSeenFromHistory(
  fuel: string,
): Promise<{ lastSeen: string | null; exceededLookback: boolean }> {
  try {
    // Check the last 30 days of data (API maximum)
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - MAX_LOOKBACK_DAYS);

    const fromStr = from.toISOString();
    const toStr = to.toISOString();

    const response = await fetch(`${CARBON_API_BASE}/generation/${fromStr}/${toStr}`);

    if (!response.ok) {
      console.warn(`Failed to fetch historical generation: ${response.status}`);
      return { lastSeen: null, exceededLookback: false };
    }

    const json = await response.json();
    const data = json.data || [];

    // Iterate backwards through history to find when fuel was last used
    for (let i = data.length - 1; i >= 0; i--) {
      const entry = data[i];
      const mix: GenerationMix[] = entry.generationmix || [];
      const fuelEntry = mix.find((m) => m.fuel.toLowerCase() === fuel);

      if (fuelEntry && fuelEntry.perc > 0) {
        // Found when it was last used
        return { lastSeen: entry.to || entry.from, exceededLookback: false };
      }
    }

    // If we didn't find it in 30 days, it's been at least 30 days
    return { lastSeen: from.toISOString(), exceededLookback: true };
  } catch (error) {
    console.warn('Error fetching historical generation:', error);
    return { lastSeen: null, exceededLookback: false };
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
        setNewRecords((prev) => prev.filter((r) => r.fuel !== fuel));
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

      const streakData: Record<string, FuelStreakData> = storedStreaks
        ? JSON.parse(storedStreaks)
        : {};

      const recordData: Record<string, FuelRecord> = storedRecords ? JSON.parse(storedRecords) : {};

      const lastSeenData: StoredLastSeen = storedLastSeen ? JSON.parse(storedLastSeen) : {};

      const updatedStreaks: FuelStreak[] = [];
      const updatedRecords: FuelRecord[] = [];

      for (const fuel of FOSSIL_FUELS) {
        const mixItem = mix.find((m) => m.fuel.toLowerCase() === fuel);
        const currentPerc = mixItem?.perc || 0;

        // Initialize if missing
        if (!streakData[fuel]) {
          streakData[fuel] = {
            fuel,
            lastSeen: null,
            streakStarted: null,
            currentPerc: 0,
            verifiedHistorically: false,
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
            isVerified: true,
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
            const result = await fetchLastSeenFromHistory(fuel);

            if (result.lastSeen) {
              lastSeenTime = new Date(result.lastSeen);
              lastSeenData[fuel] = JSON.stringify({
                timestamp: result.lastSeen,
                exceededLookback: result.exceededLookback,
              });
              streakData[fuel].lastSeen = result.lastSeen;
              streakData[fuel].streakStarted = result.lastSeen;
              isVerified = true;

              // Store if we exceeded lookback for display purposes
              if (result.exceededLookback) {
                streakData[fuel].exceededLookback = true;
              }
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
                  celebrated: false,
                  exceededLookback: streakData[fuel].exceededLookback,
                };
              }

              updatedStreaks.push({
                fuel,
                days,
                hours,
                isActive: true,
                isNewRecord,
                previousRecord: previousRecordDays,
                isVerified,
                exceededLookback: streakData[fuel].exceededLookback,
              });

              // Check if we should show celebration
              if (
                recordData[fuel] &&
                !recordData[fuel].celebrated &&
                recordData[fuel].newRecord > 1
              ) {
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
                isVerified,
              });
            }
          } else {
            updatedStreaks.push({
              fuel,
              days: 0,
              hours: 0,
              isActive: false,
              isNewRecord: false,
              isVerified: false,
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
export function formatStreakDuration(
  days: number,
  hours: number,
  exceededLookback?: boolean,
): string {
  if (days === 0) return '';
  if (exceededLookback) return `${days}+ days`; // Show "30+ days" if we hit the API limit
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

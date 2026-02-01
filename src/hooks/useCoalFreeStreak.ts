import { useEffect, useState } from 'react';
import { GenerationMix } from '@/lib/carbonApi';

const STORAGE_KEY = 'coal-free-streak';

interface CoalStreakData {
    lastCoalDetected: string | null; // ISO timestamp
    streakStarted: string | null;
}

interface CoalFreeStreak {
    days: number;
    hours: number;
    isActive: boolean;
}

export function useCoalFreeStreak(generationMix?: GenerationMix[]): CoalFreeStreak {
    const [streak, setStreak] = useState<CoalFreeStreak>({ days: 0, hours: 0, isActive: false });

    useEffect(() => {
        if (!generationMix || generationMix.length === 0) {
            return;
        }

        // Find coal in generation mix
        const coalMix = generationMix.find(m => m.fuel.toLowerCase().includes('coal'));
        const coalPercentage = coalMix?.perc || 0;

        // Get stored streak data
        const stored = localStorage.getItem(STORAGE_KEY);
        let streakData: CoalStreakData = stored
            ? JSON.parse(stored)
            : { lastCoalDetected: null, streakStarted: null };

        const now = new Date().toISOString();

        if (coalPercentage === 0) {
            // Coal-free! Update or initialize streak
            if (!streakData.streakStarted) {
                // First time seeing coal-free, start the streak
                streakData.streakStarted = now;
                streakData.lastCoalDetected = null;
            }
            // else: streak continues, don't update streakStarted
        } else {
            // Coal detected! Reset streak
            streakData.lastCoalDetected = now;
            streakData.streakStarted = null;
        }

        // Save updated data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(streakData));

        // Calculate current streak
        if (streakData.streakStarted && coalPercentage === 0) {
            const start = new Date(streakData.streakStarted);
            const current = new Date();
            const diffMs = current.getTime() - start.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            const days = Math.floor(diffHours / 24);
            const hours = Math.floor(diffHours % 24);

            setStreak({ days, hours, isActive: true });
        } else {
            setStreak({ days: 0, hours: 0, isActive: false });
        }
    }, [generationMix]);

    return streak;
}

// Helper to format streak for display
export function formatStreak(streak: CoalFreeStreak): string {
    if (!streak.isActive) return '';

    if (streak.days === 0) {
        return `${streak.hours} hour${streak.hours !== 1 ? 's' : ''}`;
    }

    return `${streak.days} day${streak.days !== 1 ? 's' : ''}, ${streak.hours} hour${streak.hours !== 1 ? 's' : ''}`;
}

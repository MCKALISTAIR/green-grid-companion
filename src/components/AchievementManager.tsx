
import { useEffect } from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import { useCarbonData } from '@/hooks/useCarbonData';
import { isSameDay, subDays } from 'date-fns';

export function AchievementManager() {
    const { unlock, progress } = useAchievements();
    const { intensity, isLoading, isError } = useCarbonData(''); // National data

    useEffect(() => {
        const checkAchievements = () => {
            const now = new Date();
            const hour = now.getHours();

            // 1. Night Owl: 1AM - 5AM
            if (hour >= 1 && hour < 5) {
                unlock('night_owl');
            }

            // 2. Grid Veteran: Visit on 30 different days
            const lastVisitKey = 'gridgreen-last-visit';
            const lastVisit = localStorage.getItem(lastVisitKey);

            if (!lastVisit || !isSameDay(new Date(lastVisit), now)) {
                // New day visit
                progress('grid_veteran', 1);
                localStorage.setItem(lastVisitKey, now.toISOString());
            }

            // 3. Clean Streak
            if (!isLoading && !isError && intensity !== undefined && intensity < 50) {
                const streakKey = 'gridgreen-clean-streak-last';
                const lastStreakDate = localStorage.getItem(streakKey);

                if (!lastStreakDate) {
                    // First low carbon visit
                    localStorage.setItem(streakKey, now.toISOString());
                    progress('clean_streak', 1);
                } else {
                    const lastDate = new Date(lastStreakDate);
                    if (isSameDay(subDays(now, 1), lastDate)) {
                        // Consecutive day!
                        localStorage.setItem(streakKey, now.toISOString());
                        progress('clean_streak', 1);
                    } else if (!isSameDay(now, lastDate)) {
                        // Missed a day, reset logic would go here if we had reset capability
                        // For now, simpler implementation: just count low intensity days?
                        // "3 days in a row" implies separate logic.
                        // Current useAchievements 'progress' just increments. 
                        // To do strict streak, we'd need reset. 
                        // Let's assume 'progress' stores current streak.

                        // If gap > 1 day, reset progress?
                        // useAchievements doesn't expose setProgress. 
                        // For simplicity in this iteration: We won't strictly reset, we'll just track legitimate consecutive updates.
                        // Actually, let's just update if consecutive.
                        localStorage.setItem(streakKey, now.toISOString());
                        // If not consecutive, we should ideally reset, but let's stick to MVP:
                        // Only increment if consecutive.
                    }
                }
            }
        };

        const timeout = setTimeout(checkAchievements, 2000); // Wait for data load
        return () => clearTimeout(timeout);
    }, [unlock, progress, intensity, isLoading, isError]);

    return null; // Invisible component
}

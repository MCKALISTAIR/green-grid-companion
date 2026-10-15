import { appStorage } from '@/lib/appStorage';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

const ACHIEVEMENTS_KEY = 'gridgreen-achievements-v1';

export const ACHIEVEMENT_LIST: Omit<Achievement, 'unlocked'>[] = [
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Check the grid between 1 AM and 5 AM',
    icon: '🦉',
  },
  {
    id: 'clean_streak',
    title: 'Clean Streak',
    description: 'Check the app 3 days in a row when intensity is below 50g',
    icon: '✨',
    maxProgress: 3,
  },
  {
    id: 'fox_spotter',
    title: 'Fox Spotter',
    description: 'Find the rare fox in the scene',
    icon: '🦊',
  },
  {
    id: 'grid_veteran',
    title: 'Grid Veteran',
    description: 'Visit the app on 30 different days',
    icon: '🎖️',
    maxProgress: 30,
  },
  {
    id: 'time_traveler',
    title: 'Time Traveler',
    description: 'Use the Time Machine to view a past date',
    icon: '⏳',
  },
  // Footprint Achievements
  {
    id: 'green_majority',
    title: 'Green Majority',
    description: 'Use 50%+ green energy in a single period',
    icon: '🌿',
  },
  {
    id: 'eco_champion',
    title: 'Eco Champion',
    description: 'Use 70%+ green energy in a single period',
    icon: '🏆',
  },
  {
    id: 'ultra_green',
    title: 'Ultra Green',
    description: 'Have 30%+ of your usage at very low intensity',
    icon: '✨',
  },
  {
    id: 'low_carbon_day',
    title: 'Low Carbon Zone',
    description: 'Achieve a period with under 1kg CO₂ emissions',
    icon: '⭐',
  },
  {
    id: 'data_tracker',
    title: 'Data Tracker',
    description: 'Track 100+ consumption readings',
    icon: '📈',
  },
];

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = appStorage.getItem(ACHIEVEMENTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge saved state with current list definitions (in case list changed)
      return ACHIEVEMENT_LIST.map((def) => {
        const existing = parsed.find((p: Achievement) => p.id === def.id);
        return {
          ...def,
          unlocked: existing?.unlocked || false,
          unlockedAt: existing?.unlockedAt,
          progress: existing?.progress || 0,
        };
      });
    }
    return ACHIEVEMENT_LIST.map((def) => ({ ...def, unlocked: false, progress: 0 }));
  });

  const saveAchievements = (newAchievements: Achievement[]) => {
    setAchievements(newAchievements);
    appStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(newAchievements));
  };

  const unlock = useCallback((id: string) => {
    setAchievements((prev) => {
      const achievement = prev.find((a) => a.id === id);
      if (!achievement || achievement.unlocked) return prev; // Already unlocked or invalid

      const updated = prev.map((a) =>
        a.id === id ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a,
      );

      appStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));

      // Toast notification
      toast.success(`Achievement Unlocked: ${achievement.title}`, {
        description: achievement.description,
        icon: achievement.icon,
        duration: 4000,
      });

      return updated;
    });
  }, []);

  const progress = useCallback((id: string, amount: number = 1) => {
    setAchievements((prev) => {
      const achievement = prev.find((a) => a.id === id);
      if (!achievement || achievement.unlocked) return prev;

      const newProgress = Math.min(
        (achievement.progress || 0) + amount,
        achievement.maxProgress || 1,
      );

      if (newProgress >= (achievement.maxProgress || 1)) {
        // Unlock if complete
        // We need to call generic unlock logic here or duplicate it
        // Since unlock needs to run in this scope, we'll duplicate the update logic
        const updated = prev.map((a) =>
          a.id === id
            ? { ...a, unlocked: true, unlockedAt: new Date().toISOString(), progress: newProgress }
            : a,
        );
        appStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));

        toast.success(`Achievement Unlocked: ${achievement.title}`, {
          description: achievement.description,
          icon: achievement.icon,
          duration: 4000,
        });
        return updated;
      }

      // Just update progress
      const updated = prev.map((a) => (a.id === id ? { ...a, progress: newProgress } : a));
      appStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    achievements,
    unlock,
    progress,
  };
}

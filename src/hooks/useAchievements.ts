import { notifyBadgesChanged } from '@/lib/trophyChip';
import { appStorage } from '@/lib/appStorage';
import { useState, useCallback } from 'react';
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
    description: 'Check the grid between 01:00 and 05:00',
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
    title: 'Time Traveller',
    description: 'Use the Time Machine to view a past date',
    icon: '⏳',
  },
  // Footprint Achievements
  {
    id: 'green_majority',
    title: 'Green Majority',
    description: 'Use 50%+ of your power in low-carbon times, in one period',
    icon: '🌿',
  },
  {
    id: 'eco_champion',
    title: 'Eco Champion',
    description: 'Use 70%+ of your power in low-carbon times, in one period',
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
    description: 'Have a period under 1kg CO₂',
    icon: '⭐',
  },
  {
    id: 'data_tracker',
    title: 'Data Tracker',
    description: 'Track 100+ meter readings',
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

  const unlock = useCallback((id: string) => {
    setAchievements((prev) => {
      const achievement = prev.find((a) => a.id === id);
      if (!achievement || achievement.unlocked) return prev; // Already unlocked or invalid

      const updated = prev.map((a) =>
        a.id === id ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a,
      );

      appStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));
      notifyBadgesChanged();

      // Toast notification
      toast.success(`Badge unlocked: ${achievement.title}`, {
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
        notifyBadgesChanged();

        toast.success(`Badge unlocked: ${achievement.title}`, {
          description: achievement.description,
          icon: achievement.icon,
          duration: 4000,
        });
        return updated;
      }

      // Just update progress
      const updated = prev.map((a) => (a.id === id ? { ...a, progress: newProgress } : a));
      appStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));
      notifyBadgesChanged();
      return updated;
    });
  }, []);

  return {
    achievements,
    unlock,
    progress,
  };
}

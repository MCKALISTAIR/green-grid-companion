import { useEffect, useMemo, useState } from 'react';
import type { GenerationMix } from '@/lib/carbonApi';
import { useCoalFreeStreak } from '@/hooks/useCoalFreeStreak';

const STORAGE_KEY = 'scene-cleanliness-streak-v1';
/** Intensity at or below this counts as a "clean" sample for garden growth. */
const CLEAN_INTENSITY_MAX = 150;
/** Cap accumulated clean hours so a long clean week doesn't explode stage math. */
const MAX_CLEAN_HOURS = 24 * 45;

export type SceneGrowthStage = 0 | 1 | 2 | 3 | 4;

interface CleanStreakStore {
  cleanHours: number;
  lastSampleAt: string | null;
  lastWasClean: boolean;
}

export interface SceneGrowth {
  /** 0 sparse → 4 lush; driven by coal-free days + accumulated clean hours. */
  stage: SceneGrowthStage;
  /** Effective garden age in whole days (for copy / HUD). */
  gardenDays: number;
  coalFreeDays: number;
  cleanHours: number;
  isGrowing: boolean;
}

function readStore(): CleanStreakStore {
  if (typeof window === 'undefined') {
    return { cleanHours: 0, lastSampleAt: null, lastWasClean: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cleanHours: 0, lastSampleAt: null, lastWasClean: false };
    const parsed = JSON.parse(raw) as CleanStreakStore;
    return {
      cleanHours: typeof parsed.cleanHours === 'number' ? parsed.cleanHours : 0,
      lastSampleAt: parsed.lastSampleAt ?? null,
      lastWasClean: Boolean(parsed.lastWasClean),
    };
  } catch {
    return { cleanHours: 0, lastSampleAt: null, lastWasClean: false };
  }
}

function writeStore(store: CleanStreakStore) {
  if (typeof window === 'undefined') return;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

/** Map combined garden days into a discrete Carrot-style growth stage. */
export function gardenDaysToStage(gardenDays: number): SceneGrowthStage {
  if (gardenDays >= 14) return 4;
  if (gardenDays >= 7) return 3;
  if (gardenDays >= 3) return 2;
  if (gardenDays >= 1) return 1;
  return 0;
}

/**
 * Temporal scene life: garden stage grows with coal-free streak + clean intensity hours.
 * Dirty periods pause growth and gently decay clean hours (no hard reset).
 *
 * Hours are the growth engine only — UI surfaces garden day / stage, never raw hours
 * (Carrot pattern: calendar story, half-hour grid truth under the hood).
 */
export function useSceneGrowth(
  intensity: number,
  generationMix?: GenerationMix[],
): SceneGrowth {
  const coalFree = useCoalFreeStreak(generationMix);
  const [cleanHours, setCleanHours] = useState(() => readStore().cleanHours);

  useEffect(() => {
    if (!Number.isFinite(intensity)) return;

    const store = readStore();
    const now = Date.now();
    const lastAt = store.lastSampleAt ? new Date(store.lastSampleAt).getTime() : now;

    // Avoid double-counting when home + scene both mount the hook
    if (store.lastSampleAt && now - lastAt < 60_000) {
      setCleanHours(store.cleanHours);
      return;
    }

    const elapsedHours = Math.min(6, Math.max(0, (now - lastAt) / 3_600_000));
    const isClean = intensity <= CLEAN_INTENSITY_MAX;

    let nextHours = store.cleanHours;
    if (isClean) {
      nextHours = Math.min(MAX_CLEAN_HOURS, store.cleanHours + Math.max(elapsedHours, 0.25));
    } else if (store.cleanHours > 0) {
      // Soft decay while dirty — garden wilts slowly, like Carrot's monthly reset vibe
      nextHours = Math.max(0, store.cleanHours - Math.max(elapsedHours * 0.35, 0.05));
    }

    const next: CleanStreakStore = {
      cleanHours: nextHours,
      lastSampleAt: new Date(now).toISOString(),
      lastWasClean: isClean,
    };
    writeStore(next);
    setCleanHours(nextHours);
  }, [intensity]);

  return useMemo(() => {
    const cleanDays = cleanHours / 24;
    const gardenDays = Math.floor(Math.max(coalFree.days + cleanDays * 0.5, cleanDays));
    const stage = gardenDaysToStage(gardenDays);
    return {
      stage,
      gardenDays,
      coalFreeDays: coalFree.days,
      cleanHours,
      isGrowing: coalFree.isActive || intensity <= CLEAN_INTENSITY_MAX,
    };
  }, [cleanHours, coalFree.days, coalFree.isActive, intensity]);
}

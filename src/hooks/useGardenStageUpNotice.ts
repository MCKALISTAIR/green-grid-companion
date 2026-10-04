import { useEffect, useState } from 'react';
import type { SceneGrowthStage } from '@/hooks/useSceneGrowth';

const STORAGE_KEY = 'scene-garden-last-seen-stage-v1';

/** Short celebratory copy — shown once per stage-up, then gone. */
export const GARDEN_STAGE_UP_COPY: Record<Exclude<SceneGrowthStage, 0>, string> = {
  1: 'Garden woke up',
  2: 'Garden is blooming',
  3: 'Garden is lush',
  4: 'Garden is thriving',
};

function readLastSeen(): SceneGrowthStage {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw == null ? 0 : Number(raw);
    if (n === 1 || n === 2 || n === 3 || n === 4) return n;
    return 0;
  } catch {
    return 0;
  }
}

function writeLastSeen(stage: SceneGrowthStage) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(stage));
  } catch {
    /* ignore quota */
  }
}

export interface GardenStageUpNotice {
  /** True only when stage just crossed above the last acknowledged stage. */
  visible: boolean;
  /** Headline for the toast line (no raw hours). */
  message: string | null;
  /** Acknowledge / dismiss so it won't show again until the next stage-up. */
  dismiss: () => void;
}

/**
 * Quiet streak UX: garden copy appears only on stage-up, never as persistent chrome.
 * Hours stay under the hood in useSceneGrowth.
 */
export function useGardenStageUpNotice(
  stage: SceneGrowthStage,
  gardenDays: number,
): GardenStageUpNotice {
  const [pendingStage, setPendingStage] = useState<SceneGrowthStage | null>(null);

  useEffect(() => {
    if (stage <= 0) {
      setPendingStage(null);
      return;
    }
    const lastSeen = readLastSeen();
    if (stage > lastSeen) {
      setPendingStage(stage);
    } else {
      setPendingStage(null);
    }
  }, [stage]);

  const dismiss = () => {
    setPendingStage((current) => {
      if (current != null) writeLastSeen(current);
      return null;
    });
  };

  // Auto-dismiss after a beat so the sheet stays the brain
  useEffect(() => {
    if (pendingStage == null) return;
    const stageToAck = pendingStage;
    const t = window.setTimeout(() => {
      writeLastSeen(stageToAck);
      setPendingStage(null);
    }, 6500);
    return () => window.clearTimeout(t);
  }, [pendingStage]);

  if (pendingStage == null || pendingStage === 0) {
    return { visible: false, message: null, dismiss };
  }

  const base = GARDEN_STAGE_UP_COPY[pendingStage];
  const message = gardenDays > 0 ? `${base} · day ${gardenDays}` : base;

  return { visible: true, message, dismiss };
}

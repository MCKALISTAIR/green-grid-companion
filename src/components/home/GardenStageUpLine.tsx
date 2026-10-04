import { AnimatePresence, motion } from 'framer-motion';
import { useGardenStageUpNotice } from '@/hooks/useGardenStageUpNotice';
import type { SceneGrowthStage } from '@/hooks/useSceneGrowth';

interface GardenStageUpLineProps {
  growthStage: SceneGrowthStage;
  gardenDays: number;
}

/**
 * Quiet streak toast under now-or-wait — only on stage-up, never persistent.
 */
export function GardenStageUpLine({ growthStage, gardenDays }: GardenStageUpLineProps) {
  const { visible, message, dismiss } = useGardenStageUpNotice(growthStage, gardenDays);

  return (
    <AnimatePresence>
      {visible && message && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35 }}
          onClick={dismiss}
          className="block w-full text-center text-xs text-muted-foreground -mt-2 cursor-default"
          data-testid="scene-garden-stage-up"
          aria-live="polite"
        >
          {message}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

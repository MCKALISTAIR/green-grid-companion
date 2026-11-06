import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sprout } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';
import { GARDEN_NOTICE_VISIBLE_MS, useGardenStageUpNotice } from '@/hooks/useGardenStageUpNotice';
import type { SceneGrowthStage } from '@/hooks/useSceneGrowth';

interface GardenStageUpPillProps {
  growthStage: SceneGrowthStage;
  gardenDays: number;
  /** False in the city scene (no garden there). */
  enabled: boolean;
}

/**
 * Garden stage-up pill, pinned at the top of the home sheet just under the hero
 * (Design, 30 Oct 2026). It is absolutely positioned over the sheet's drag-handle
 * row, so appearing or leaving never moves anything. It stays until tapped, or
 * for GARDEN_NOTICE_VISIBLE_MS after it actually comes into view, and gives one
 * light haptic when it does (Settings > Haptics, skipped under Reduce Motion).
 */
export function GardenStageUpPill({ growthStage, gardenDays, enabled }: GardenStageUpPillProps) {
  const { visible, message, dismiss } = useGardenStageUpNotice(growthStage, gardenDays, enabled);
  const { impactLight } = useHaptics({ decorative: true });
  const ref = useRef<HTMLButtonElement>(null);
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  const hapticRef = useRef(impactLight);
  hapticRef.current = impactLight;

  useEffect(() => {
    const el = ref.current;
    if (!visible || !el) return;
    let timer: number | undefined;
    const start = () => {
      if (timer !== undefined) return;
      void hapticRef.current();
      timer = window.setTimeout(() => dismissRef.current(), GARDEN_NOTICE_VISIBLE_MS);
    };
    if (typeof IntersectionObserver === 'undefined') {
      start();
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start();
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [visible]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-30 !mt-0 flex justify-center px-3 lg:top-2">
      <AnimatePresence>
        {visible && message && (
          <motion.button
            ref={ref}
            type="button"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            onClick={dismiss}
            className="pointer-events-auto inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[13px] text-foreground shadow-sm min-[360px]:gap-1.5 min-[360px]:px-3 min-[360px]:text-sm"
            data-testid="scene-garden-stage-up"
            aria-live="polite"
          >
            <Sprout
              className="h-3.5 w-3.5 shrink-0 min-[360px]:h-4 min-[360px]:w-4 text-green-600"
              aria-hidden="true"
            />
            <span className="truncate" data-testid="scene-garden-stage-up-text">
              {message}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

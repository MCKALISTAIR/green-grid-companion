import { AnimatePresence, motion } from 'framer-motion';
import type { SceneGrowthStage } from '@/hooks/useSceneGrowth';
import { Flowers } from './Flowers';
import { gardenFlowerPositions, GARDEN_FLOWER_SCALE } from '@/lib/gardenFlowers';
import { SCENE_SILHOUETTE_ASPECT } from '@/lib/sceneScaleBible';
import { Butterfly } from './Butterfly';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SceneTemporalLifeProps {
  stage: SceneGrowthStage;
  isCity: boolean;
  isCoastal: boolean;
  isDaytime: boolean;
  isNight: boolean;
}

/**
 * Streak-tied garden evolution (Carrot comparison bet).
 * Stage grows with coal-free + clean intensity hours — not random ambient noise.
 */
export function SceneTemporalLife({
  stage,
  isCity,
  isCoastal,
  isDaytime,
  isNight,
}: SceneTemporalLifeProps) {
  const shouldReduceMotion = useReducedMotion();
  if (stage < 1 || isCity) return null;

  const flowerPositions = gardenFlowerPositions(stage);

  return (
    <AnimatePresence>
      <motion.div
        key={`growth-${stage}`}
        className="absolute inset-0 pointer-events-none z-[14]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0.01 : 0.8 }}
        aria-hidden
      >
        {/* Edge vines / growth wash — denser as stage rises */}
        {!isCoastal && (
          <div
            className="absolute inset-x-0 bottom-0 h-[42%]"
            style={{
              background: `linear-gradient(to top, rgba(34,197,94,${0.04 + stage * 0.03}), transparent)`,
            }}
          />
        )}

        {isDaytime && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%]">
            {/* #221: same box, viewBox and meet fit as the front hill, so the stems
                stand on its ridge at every aspect (no stretching). */}
            <svg
              viewBox="0 30 400 120"
              className="w-full h-full"
              preserveAspectRatio={SCENE_SILHOUETTE_ASPECT}
              aria-hidden="true"
              data-garden-flowers
            >
              <Flowers positions={flowerPositions} scale={GARDEN_FLOWER_SCALE} />
            </svg>
          </div>
        )}

        {stage >= 2 && isDaytime && (
          <>
            <Butterfly startX={20} delay={1} />
            {stage >= 3 && <Butterfly startX={65} delay={2.5} />}
          </>
        )}

        {stage >= 3 && isNight && !shouldReduceMotion && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 4 + stage }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute w-1 h-1 rounded-full bg-emerald-200/80"
                style={{
                  left: `${12 + i * 14}%`,
                  top: `${18 + (i % 3) * 10}%`,
                }}
                animate={{
                  opacity: [0.2, 0.9, 0.2],
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 3 + i * 0.4,
                  repeat: Infinity,
                  delay: i * 0.35,
                }}
              />
            ))}
          </div>
        )}

        {stage >= 4 && isDaytime && !shouldReduceMotion && (
          <motion.div
            className="absolute inset-x-[15%] top-[12%] h-16 rounded-full"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(250,250,210,0.28), transparent 70%)',
            }}
            animate={{ opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

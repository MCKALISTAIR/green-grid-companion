import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { Flowers } from '../Flowers';
import { Bee } from '../Bee';
import { Rabbit } from '../Rabbit';
import { Owl } from '../Owl';
import { Fox } from '../Fox';

export interface SceneEcosystemLayerProps {
  sceneConfig: SceneVisualConfig;
  isCity: boolean;
  isCoastal: boolean;
  isNight: boolean;
  isDawnOrDusk: boolean;
  shouldReduceMotion: boolean;
  backY: MotionValue<number>;
  midY: MotionValue<number>;
  showFox: boolean;
  onFoxClick: () => void;
}

export function SceneEcosystemLayer({
  sceneConfig,
  isCity,
  isCoastal,
  isNight,
  isDawnOrDusk,
  shouldReduceMotion,
  backY,
  midY,
  showFox,
  onFoxClick,
}: SceneEcosystemLayerProps) {
  return (
    <>
      {/* ===== PHASE 2: LIVING ECOSYSTEM ===== */}

      {/* Flowers for bees */}
      <AnimatePresence>
        {!isCity && !isCoastal && sceneConfig.cleanliness > 0.8 && sceneConfig.isDaytime && (
          <div className="absolute bottom-0 left-0 right-0 h-[75%] pointer-events-none z-12">
            <svg viewBox="0 30 400 120" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <Flowers positions={[
                { x: 50, y: 120 },
                { x: 120, y: 115 },
                { x: 200, y: 118 },
                { x: 280, y: 120 },
                { x: 350, y: 117 },
              ]} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Bees visiting flowers */}
      <AnimatePresence>
        {!isCity && !isCoastal && sceneConfig.cleanliness > 0.8 && sceneConfig.isDaytime && (
          <>
            <Bee startX={15} startY={18} delay={0} />
            <Bee startX={50} startY={22} delay={2} />
            <Bee startX={75} startY={20} delay={4} />
          </>
        )}
      </AnimatePresence>

      {/* Rabbit hopping at dawn/dusk */}
      <AnimatePresence>
        {!isCity && !isCoastal && isDawnOrDusk && sceneConfig.cleanliness > 0.6 && <Rabbit delay={0} />}
      </AnimatePresence>

      {/* Owls perched on trees at night */}
      <AnimatePresence>
        {isNight && sceneConfig.cleanliness > 0.7 && (
          <>
            {/* Left Owl (Back hill - backY) */}
            <motion.div
              style={{ y: shouldReduceMotion ? 0 : backY }}
              className="absolute bottom-0 left-0 right-0 h-[75%] pointer-events-none z-12"
            >
              <svg viewBox="0 30 400 120" className="w-full h-full" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
                <Owl treeX={80} treeY={85} scale={0.25} />
              </svg>
            </motion.div>

            {/* Right Owl (Mid hill - midY) */}
            <motion.div
              style={{ y: shouldReduceMotion ? 0 : midY }}
              className="absolute bottom-0 left-0 right-0 h-[75%] pointer-events-none z-12"
            >
              <svg viewBox="0 30 400 120" className="w-full h-full" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
                <Owl treeX={320} treeY={95} scale={0.4} />
              </svg>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fox - Rare event at dusk */}
      <AnimatePresence>
        {showFox && (
          <Fox onClick={onFoxClick} />
        )}
      </AnimatePresence>
    </>
  );
}

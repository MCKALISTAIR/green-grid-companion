import { motion, AnimatePresence } from 'framer-motion';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { FlyingBird } from '../FlyingBird';
import { birdTopInBand, type BirdFlightBand } from '@/lib/birdFlightBand';
import { Butterfly } from '../Butterfly';
import { Firefly } from '../Firefly';

export interface SceneAmbientLifeProps {
  sceneConfig: SceneVisualConfig;
  shouldReduceMotion: boolean;
  birdConfig: Array<{ id: number; top: number; delay: number; duration: number; scale: number }>;
  /** BH-116: px lane below the hero text; null hides the birds; undefined keeps the % heights. */
  birdBand?: BirdFlightBand | null;
  fireflyConfig: Array<{ id: number; delay: number; x: number; y: number }>;
}

export function SceneAmbientLife({
  sceneConfig,
  birdConfig,
  birdBand,
  fireflyConfig,
}: SceneAmbientLifeProps) {
  return (
    <>
      {/* Always-on decorative clouds removed (art pass v1 §2.3): clouds now come only
          from real cloud cover, drawn in WeatherEffects. */}

      {/* Flying birds for clean energy */}
      <AnimatePresence>
        {sceneConfig.showBirds && birdBand !== null && (
          <motion.div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            data-bird-lane={birdBand ? `${birdBand.minTopPx}-${birdBand.maxTopPx}` : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {birdConfig.slice(0, sceneConfig.birdCount).map((bird) => {
              const top = birdBand ? `${birdTopInBand(birdBand, bird.top)}px` : `${bird.top}%`;
              // Keyed on top: framer-motion keeps the first style.top it saw, so a
              // bird remounts (restarts its pass) when the lane moves (BH-116).
              return (
                <FlyingBird
                  key={`${bird.id}-${top}`}
                  delay={bird.delay}
                  duration={bird.duration}
                  startX={-10}
                  top={top}
                  scale={bird.scale}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Butterflies for very clean energy */}
      <AnimatePresence>
        {sceneConfig.showButterflies && (
          <>
            <Butterfly startX={10} delay={0} />
            <Butterfly startX={50} delay={3} />
          </>
        )}
      </AnimatePresence>

      {/* Fireflies for clean nights */}
      <AnimatePresence>
        {sceneConfig.showFireflies && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {fireflyConfig.map((firefly) => (
              <Firefly key={firefly.id} delay={firefly.delay} x={firefly.x} y={firefly.y} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { FlyingBird } from '../FlyingBird';
import { Butterfly } from '../Butterfly';
import { Firefly } from '../Firefly';

export interface SceneAmbientLifeProps {
  sceneConfig: SceneVisualConfig;
  shouldReduceMotion: boolean;
  birdConfig: Array<{ id: number; top: number; delay: number; duration: number; scale: number }>;
  fireflyConfig: Array<{ id: number; delay: number; x: number; y: number }>;
}

export function SceneAmbientLife({
  sceneConfig,
  shouldReduceMotion,
  birdConfig,
  fireflyConfig,
}: SceneAmbientLifeProps) {
  return (
    <>
      {/* Always-on decorative clouds removed (art pass v1 §2.3): clouds now come only
          from real cloud cover, drawn in WeatherEffects. */}

      {/* Extra pollution clouds for dirty energy */}
      <AnimatePresence>
        {sceneConfig.showSmoke && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            ></motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Flying birds for clean energy */}
      <AnimatePresence>
        {sceneConfig.showBirds && (
          <motion.div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {birdConfig.slice(0, sceneConfig.birdCount).map((bird) => (
              <FlyingBird
                key={bird.id}
                delay={bird.delay}
                duration={bird.duration}
                startX={-10}
                top={bird.top}
                scale={bird.scale}
              />
            ))}
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

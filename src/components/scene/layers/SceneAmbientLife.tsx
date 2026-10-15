import { motion, AnimatePresence } from 'framer-motion';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { RainDrop } from '../RainDrop';
import { InteractiveCloud } from '../InteractiveCloud';
import { FlyingBird } from '../FlyingBird';
import { Butterfly } from '../Butterfly';
import { Firefly } from '../Firefly';

export interface SceneAmbientLifeProps {
  sceneConfig: SceneVisualConfig;
  shouldReduceMotion: boolean;
  rainConfig: Array<{ id: number; delay: number; x: number }>;
  birdConfig: Array<{ id: number; top: number; delay: number; duration: number; scale: number }>;
  fireflyConfig: Array<{ id: number; delay: number; x: number; y: number }>;
}

export function SceneAmbientLife({
  sceneConfig,
  shouldReduceMotion,
  rainConfig,
  birdConfig,
  fireflyConfig,
}: SceneAmbientLifeProps) {
  return (
    <>
      {/* Rain effect for dirty energy */}
      <AnimatePresence>
        {sceneConfig.showRain && (
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {rainConfig.map((drop) => (
              <RainDrop key={drop.id} delay={drop.delay} x={drop.x} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <InteractiveCloud
        className={`absolute top-20 w-24 h-14 text-card/80 ${shouldReduceMotion ? '' : 'animate-cloud-drift'}`}
        style={
          shouldReduceMotion ? { left: '10%' } : { animationDelay: '0s', animationDuration: '35s' }
        }
        shouldReduceMotion={shouldReduceMotion}
      />
      <InteractiveCloud
        className={`absolute top-28 w-16 h-10 text-card/60 ${shouldReduceMotion ? '' : 'animate-cloud-drift'}`}
        style={
          shouldReduceMotion
            ? { left: '60%' }
            : { animationDelay: '-12s', animationDuration: '45s' }
        }
        shouldReduceMotion={shouldReduceMotion}
      />
      <InteractiveCloud
        className={`absolute top-14 w-20 h-12 text-card/70 ${shouldReduceMotion ? '' : 'animate-cloud-drift'}`}
        style={
          shouldReduceMotion
            ? { left: '80%' }
            : { animationDelay: '-25s', animationDuration: '40s' }
        }
        shouldReduceMotion={shouldReduceMotion}
      />

      {/* Extra pollution clouds for dirty energy */}
      <AnimatePresence>
        {sceneConfig.showSmoke && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            >
              <InteractiveCloud
                className={`absolute top-8 w-28 h-16 text-secondary/50 ${shouldReduceMotion ? '' : 'animate-cloud-drift'}`}
                style={
                  shouldReduceMotion
                    ? { left: '20%' }
                    : { animationDelay: '-5s', animationDuration: '25s' }
                }
                shouldReduceMotion={shouldReduceMotion}
              />
              <InteractiveCloud
                className={`absolute top-14 w-24 h-14 text-secondary/40 ${shouldReduceMotion ? '' : 'animate-cloud-drift'}`}
                style={
                  shouldReduceMotion
                    ? { left: '50%' }
                    : { animationDelay: '-18s', animationDuration: '28s' }
                }
                shouldReduceMotion={shouldReduceMotion}
              />
            </motion.div>
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

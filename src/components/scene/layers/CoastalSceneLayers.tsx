import { motion, AnimatePresence, type MotionValue } from 'framer-motion';
import type { TimeOfDay } from '@/hooks/useTimeOfDay';
import type { SceneVisualConfig } from '@/lib/sceneConfig';
import { CoastalLandscapeBack, CoastalLandscapeMid, CoastalLandscapeFront } from '../CoastalLandscape';
import { SeagullFlock, SailingBoat, FishingBoat, CoastalOffshoreWind, RockPoolGroup, HarbourSeal, CoastalHorizonPollution } from '../CoastalElements';
import { SmogBand } from '../CityElements';
import { ValleyMist } from '../ValleyMist';
import { JumpingFish } from '../JumpingFish';
import { SceneHotspots, type HotspotDef } from '../SceneHotspots';
import { SCENE_SILHOUETTE_ASPECT } from '@/lib/sceneScaleBible';

export interface CoastalSceneLayersProps {
  shouldReduceMotion: boolean;
  backY: MotionValue<number>;
  midY: MotionValue<number>;
  sceneConfig: SceneVisualConfig;
  isNight: boolean;
  synthwaveMode: boolean;
  isSnowing: boolean;
  skipIntro: boolean;
  windSpeed: number;
  timeOfDay: TimeOfDay;
  windPercentage: number;
  hydroPercentage: number;
  marinePercentage: number;
}

export function CoastalSceneLayers({
  shouldReduceMotion,
  backY,
  midY,
  sceneConfig,
  isNight,
  synthwaveMode,
  isSnowing,
  skipIntro,
  windSpeed,
  timeOfDay,
  windPercentage,
  hydroPercentage,
  marinePercentage,
}: CoastalSceneLayersProps) {
  return (
    <>
      {/* Coastal: Ocean + horizon */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : backY }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-0 overflow-hidden"
      >
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
          <SmogBand cleanliness={sceneConfig.cleanliness} isNight={isNight} />
          <CoastalLandscapeBack
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={isSnowing}
            skipIntro={skipIntro}
            windSpeed={windSpeed}
            timeOfDay={timeOfDay}
          />
          {/* Pollution sits above the sea fill so stacks / sheen / tanker stay visible */}
          <CoastalHorizonPollution cleanliness={sceneConfig.cleanliness} isNight={isNight} />
        </svg>
      </motion.div>

      {/* Coastal: Offshore wind — demote when dirty so pollution reads as the hero */}
      <AnimatePresence>
        {windPercentage > 5 && sceneConfig.cleanliness > 0.25 && (
          <motion.div
            style={{ y: shouldReduceMotion ? 0 : backY }}
            className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-5 overflow-hidden"
          >
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
              <CoastalOffshoreWind
                count={Math.min(4, Math.floor(windPercentage / 8))}
                windSpeed={windSpeed}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coastal: Midground cliffs & lighthouse */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : midY }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-6 overflow-hidden"
      >
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
          <CoastalLandscapeMid
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={isSnowing}
            skipIntro={skipIntro}
            windSpeed={windSpeed}
            timeOfDay={timeOfDay}
          />
        </svg>
      </motion.div>

      {/* Coastal: Boats — sailing craft demote when dirty; fishing boat stays as working harbour */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : midY }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-10 overflow-hidden"
      >
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
          {sceneConfig.cleanliness > 0.4 && <SailingBoat x={120} delay={0} isNight={isNight} />}
          <FishingBoat x={250} delay={5} isNight={isNight} />
          {sceneConfig.cleanliness > 0.6 && <SailingBoat x={200} delay={12} isNight={isNight} />}
        </svg>
      </motion.div>

      {/* Coastal: Valley Mist */}
      <ValleyMist cleanliness={sceneConfig.cleanliness} timeOfDay={timeOfDay} isNight={isNight} />

      {/* Coastal: Harbour seal */}
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : midY }}
        className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-[15] overflow-hidden"
      >
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
          <HarbourSeal x={165} y={96} delay={3} />
          {sceneConfig.cleanliness > 0.7 && <HarbourSeal x={220} y={98} delay={15} />}
        </svg>
      </motion.div>

      {/* Coastal: Splashing Jumping Fish on clean days */}
      <AnimatePresence>
        {sceneConfig.cleanliness > 0.6 && (
          <motion.div
            style={{ y: shouldReduceMotion ? 0 : midY }}
            className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-[14] overflow-hidden"
          >
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
              <JumpingFish x={110} y={95} delay={4} />
              <JumpingFish x={280} y={97} delay={10} />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coastal: Foreground (beach + cliffs - static for ground flush) */}
      <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-20 overflow-hidden">
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
          <CoastalLandscapeFront
            cleanliness={sceneConfig.cleanliness}
            isNight={isNight}
            synthwaveMode={synthwaveMode}
            isSnowing={isSnowing}
            skipIntro={skipIntro}
            windSpeed={windSpeed}
            timeOfDay={timeOfDay}
          />
        </svg>
      </div>

      {/* Coastal: Rock pools & crabs (clean energy = low tide) */}
      <AnimatePresence>
        {sceneConfig.cleanliness > 0.5 && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-[22] overflow-hidden">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
              <RockPoolGroup cleanliness={sceneConfig.cleanliness} isNight={isNight} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Coastal: Seagulls */}
      <AnimatePresence>
        {sceneConfig.isDaytime && sceneConfig.cleanliness > 0.3 && (
          <div className="absolute bottom-0 left-0 right-0 h-[100%] pointer-events-none z-[23] overflow-hidden">
            <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio={SCENE_SILHOUETTE_ASPECT} aria-hidden="true">
              <SeagullFlock count={sceneConfig.cleanliness > 0.6 ? 5 : 3} isNight={isNight} />
            </svg>
          </div>
        )}
      </AnimatePresence>

      {/* Coastal: Diegetic info hotspots */}
      <SceneHotspots
        hotspots={[
          {
            id: 'coastal-wind',
            label: 'Offshore Wind',
            x: 38, y: 55,
            visible: windPercentage > 5 && sceneConfig.cleanliness > 0.25,
            fact: 'Offshore wind turbines benefit from stronger, more consistent sea winds to generate vast amounts of clean energy.',
          },
          {
            id: 'coastal-rockpools',
            label: 'Rock Pools',
            x: 68, y: 80,
            visible: sceneConfig.cleanliness > 0.5,
            fact: 'At low tide, rock pools reveal a rich ecosystem. Keeping the grid clean helps prevent ocean acidification and protects marine life.',
          },
          {
            id: 'coastal-tidal',
            label: 'Tidal Energy',
            x: 50, y: 88,
            visible: hydroPercentage > 5 || marinePercentage > 0,
            fact: 'Tidal and wave energy harnesses the predictable movement of tides and ocean currents to generate reliable, clean power.',
          },
          {
            id: 'coastal-stack',
            label: 'Coastal Peaker',
            x: 55, y: 48,
            visible: sceneConfig.cleanliness < 0.35,
            fact: 'When the grid is dirty, coastal gas peakers and shipping emissions push local carbon intensity up — the water and sky tell the story.',
          },
        ] satisfies HotspotDef[]}
      />
    </>
  );
}

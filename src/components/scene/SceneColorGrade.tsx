import { motion } from 'framer-motion';

interface Props {
  cleanliness: number; // 0..1
  isNight: boolean;
}

/**
 * Full-scene colour-grading overlay tied to cleanliness.
 * Sits above the landscape but below interactive HUD layers.
 *
 *  - Very clean → cool teal wash + soft top bloom.
 *  - Moderate   → neutral (overlay fades to ~0).
 *  - Very dirty → sepia/sickly-yellow wash + edge vignette.
 *
 * Designed so the silhouette test passes: clean vs dirty reads in <1s
 * even when squinting and even at night.
 */
export function SceneColorGrade({ cleanliness, isNight }: Props) {
  // cleanScore: -1 (very dirty) … 0 (mid) … +1 (very clean)
  const cleanScore = Math.max(-1, Math.min(1, (cleanliness - 0.5) * 2));

  // Tint colour swings from sickly amber → transparent → cool teal
  const tint =
    cleanScore >= 0
      ? `rgba(56, 189, 178, ${cleanScore * (isNight ? 0.22 : 0.16)})` // teal
      : `rgba(180, 130, 40, ${-cleanScore * (isNight ? 0.32 : 0.28)})`; // sickly amber

  // Bloom (top): only when clean. Adds a sense of fresh light.
  const bloomOpacity = Math.max(0, cleanScore) * (isNight ? 0.35 : 0.5);

  // Vignette (edges): only when dirty. Soft enough that landmarks survive.
  const vignetteOpacity = Math.max(0, -cleanScore) * (isNight ? 0.42 : 0.28);

  return (
    <div className="absolute inset-0 z-[22] pointer-events-none" aria-hidden="true">
      {/* Flat tint */}
      <motion.div
        className="absolute inset-0"
        animate={{ backgroundColor: tint }}
        transition={{ duration: 2.2, ease: 'easeInOut' as const }}
        style={{ mixBlendMode: 'soft-light' }}
      />
      {/* Top bloom (clean) */}
      <motion.div
        className="absolute inset-x-0 top-0 h-1/2"
        animate={{ opacity: bloomOpacity }}
        transition={{ duration: 2.2, ease: 'easeInOut' as const }}
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(180,255,230,0.55), rgba(180,255,230,0) 70%)',
          mixBlendMode: 'screen',
        }}
      />
      {/* Edge vignette (dirty) */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: vignetteOpacity }}
        transition={{ duration: 2.2, ease: 'easeInOut' as const }}
        style={{
          background:
            'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 50%, rgba(60,30,0,0.85) 100%)',
        }}
      />
    </div>
  );
}

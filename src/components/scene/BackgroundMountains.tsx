import { motion } from 'framer-motion';
import { useId } from 'react';

/** Night far-hill fills: lavender a step above the night horizon (#392763). */
const NIGHT_TOP = 0.95;

export const NIGHT_FAR_HILLS = { base: '#968ace', mid: '#a498d8', highlight: '#b2a7e2' } as const;

/**
 * #239 Design review: ridge-top stop opacities. By day they stay as they were.
 * At night the far ridge was only about 1.1:1 against the sky, so the tops are
 * stronger there, for about 1.25:1 (measured at 390, 320 and 720x540).
 */
export const RIDGE_TOP_OPACITY = {
  day: { back: 0.4, mid: 0.5, front: 0.4 },
  night: { back: NIGHT_TOP, mid: NIGHT_TOP, front: NIGHT_TOP },
} as const;

interface BackgroundMountainsProps {
  isNight: boolean;
}

export function BackgroundMountains({ isNight }: BackgroundMountainsProps) {
  const id = useId();
  // Grounded at Y=30-70 (far background, distant horizon)

  // Scene audit item 10: the night slates were darker than the night sky, so
  // the far hills vanished and the sheep floated. At night they are one step
  // lighter than the sky instead (NIGHT_FAR_HILLS, tested).
  const baseColor = isNight ? NIGHT_FAR_HILLS.base : '#475569';
  const midColor = isNight ? NIGHT_FAR_HILLS.mid : '#64748b';
  const highlightColor = isNight ? NIGHT_FAR_HILLS.highlight : '#94a3b8';
  const top = isNight ? RIDGE_TOP_OPACITY.night : RIDGE_TOP_OPACITY.day;

  return (
    <motion.g
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 0.6, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
    >
      <defs>
        <linearGradient id={`${id}-mountain-back`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={baseColor} stopOpacity={top.back} />
          <stop offset="100%" stopColor={baseColor} stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id={`${id}-mountain-mid`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={midColor} stopOpacity={top.mid} />
          <stop offset="100%" stopColor={midColor} stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id={`${id}-mountain-front`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={highlightColor} stopOpacity={top.front} />
          <stop offset="100%" stopColor={highlightColor} stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Farthest layer - soft, tall sweeping curves */}
      <path
        d="M-50,100 Q20,50 90,80 T250,60 T450,90 L450,150 L-50,150 Z"
        fill={`url(#${id}-mountain-back)`}
      />

      {/* Mid layer - distinct jagged but rounded peaks */}
      <path
        d="M0,110 Q40,65 80,95 C120,50 150,45 180,80 C220,30 260,55 290,85 Q350,40 400,100 L400,150 L0,150 Z"
        fill={`url(#${id}-mountain-mid)`}
      />

      {/* Frontmost background layer - rolling foothills */}
      <path
        d="M-20,120 Q60,80 140,110 T320,90 T420,120 L420,150 L-20,150 Z"
        fill={`url(#${id}-mountain-front)`}
      />

      {/* Snow caps on highest mid-layer peaks (if not night) */}
      {!isNight && (
        <g opacity="0.4">
          <path d="M135,55 Q150,45 160,60 Q150,60 135,55 Z" fill="white" />
          <path d="M225,45 Q240,35 250,55 Q240,50 225,45 Z" fill="white" />
        </g>
      )}
    </motion.g>
  );
}

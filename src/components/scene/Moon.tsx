import { motion } from 'framer-motion';
import { useId } from 'react';

interface MoonProps {
  position?: number; // 0-1, arc position
  onDoubleClick?: () => void;
}

export function Moon({ position = 0.5, onDoubleClick }: MoonProps) {
  const id = useId();
  // Calculate position on arc
  const arcX = 20 + position * 60; // 20% to 80% of width
  const arcY = 15 + Math.sin(position * Math.PI) * -5; // Slight arc, pushed down to 10-15% range

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        right: `${arcX}%`,
        top: `${arcY}%`,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 1 }}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (onDoubleClick && (e.key === 'Enter' || e.key === ' ')) {
          onDoubleClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Moon - Double click or press Enter to trigger meteor shower"
    >
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        className="overflow-visible -translate-x-6 -translate-y-6"
        aria-hidden="true"
      >
        <defs>
          {/* Outer glow filter */}
          <filter id={`${id}-moon-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Body gradient - off-white to soft silver */}
          <radialGradient id={`${id}-moon-body`} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>

          {/* Crater depth gradient inner shadow effect */}
          <radialGradient id={`${id}-crater-depth`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
            <stop offset="80%" stopColor="#94a3b8" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* Ambient background glow (separate from filter glow for stronger effect) */}
        <circle cx="48" cy="48" r="32" fill="rgba(255,255,255,0.15)" filter={`url(#${id}-moon-glow)`} />

        {/* Moon body */}
        <circle cx="48" cy="48" r="24" fill={`url(#${id}-moon-body)`} filter={`url(#${id}-moon-glow)`} />

        {/* Craters mapped to the 24px radius moon body at center (48,48) */}
        <g stroke="rgba(255,255,255,0.4)" strokeWidth="0.5">
          <circle cx="36" cy="36" r="4" fill={`url(#${id}-crater-depth)`} />
          <circle cx="58" cy="40" r="6" fill={`url(#${id}-crater-depth)`} />
          <circle cx="42" cy="56" r="3" fill={`url(#${id}-crater-depth)`} />
          <circle cx="54" cy="58" r="5" fill={`url(#${id}-crater-depth)`} />
          <circle cx="62" cy="50" r="2" fill={`url(#${id}-crater-depth)`} />
          <circle cx="38" cy="48" r="2.5" fill={`url(#${id}-crater-depth)`} />
        </g>
      </svg>
    </motion.div>
  );
}

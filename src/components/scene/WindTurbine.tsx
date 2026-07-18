import { motion } from 'framer-motion';
import { useId } from 'react';
import { useHaptics } from '@/hooks/useHaptics';

export function WindTurbine({ scale = 1, speed = 4, onClick }: { scale?: number; speed?: number; onClick?: () => void }) {
  const id = useId();
  const { impactLight } = useHaptics();

  const handleClick = () => {
    impactLight();
    onClick?.();
  };

  return (
    <motion.div
      className="relative w-12 h-24 z-10 cursor-pointer active:scale-95 transition-transform"
      style={{ scale }}
      whileHover={{ scale: scale * 1.12 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.6 }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Wind Turbine - Click to boost speed"
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          handleClick();
        }
      }}
    >
      {/*
        Single-SVG turbine so the rotor pivot is in the SAME coordinate space as the tower.
        This avoids CSS/SVG transform-origin edge cases that can make the blades appear to orbit.
      */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 48 96"
        aria-hidden="true"
      >
        {/* Gradient definitions for shading */}
        <defs>
          {/* Tower gradient - darker at edges */}
          <linearGradient id={`${id}-towerGradient`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e5e5e5" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#e5e5e5" stopOpacity="0.9" />
          </linearGradient>

          {/* Nacelle gradient - subtle 3D effect */}
          <linearGradient id={`${id}-nacelleGradient`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#f0f0f0" stopOpacity="0.9" />
          </linearGradient>

          {/* Blade gradient - lighter towards tip */}
          <linearGradient id={`${id}-bladeGradient`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f8f8f8" stopOpacity="0.8" />
          </linearGradient>

          {/* Hub radial gradient for 3D sphere effect */}
          <radialGradient id={`${id}-hubGradient`} cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#e0e0e0" stopOpacity="0.9" />
          </radialGradient>

          {/* Shadow gradient for ground effect */}
          <radialGradient id={`${id}-towerShadow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground shadow - ellipse at base of tower */}
        <ellipse
          cx="24"
          cy="94"
          rx="8"
          ry="2"
          fill={`url(#${id}-towerShadow)`}
        />

        {/* Tower - tapered slightly, with shading */}
        <polygon
          points="21.5,24 26.5,24 25,92 23,92"
          fill={`url(#${id}-towerGradient)`}
        />
        {/* Tower highlight stripe */}
        <rect x="23.5" y="26" width="1" height="64" rx="0.5" className="fill-card/30" />

        {/* Nacelle - larger, more realistic proportions */}
        <rect x="18" y="17" width="12" height="6" rx="2" fill={`url(#${id}-nacelleGradient)`} />
        {/* Nacelle detail line */}
        <rect x="19" y="19" width="10" height="1" rx="0.5" className="fill-card/20" />

        {/* Warning light with glow */}
        <motion.circle
          cx="24"
          cy="15"
          r="1.2"
          className="fill-destructive"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Light glow effect */}
        <motion.circle
          cx="24"
          cy="15"
          r="2.5"
          className="fill-destructive/30"
          animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Rotor (native SVG rotation around hub at 24,20) */}
        <g>
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 24 20"
            to="360 24 20"
            dur={`${speed}s`}
            repeatCount="indefinite"
          />

          {/* Three blades - more aerodynamic shape */}
          <g>
            {/* Blade 1 - pointing up */}
            {/* Blade 1 - pointing up (Elongated) */}
            <path
              d="M24,20 L22.5,18 L22,5 Q24,-5 26,5 L25.5,18 Z"
              fill={`url(#${id}-bladeGradient)`}
            />
            {/* Blade 2 - 120° */}
            <path
              d="M24,20 L22.5,18 L22,5 Q24,-5 26,5 L25.5,18 Z"
              fill={`url(#${id}-bladeGradient)`}
              transform="rotate(120 24 20)"
            />
            {/* Blade 3 - 240° */}
            <path
              d="M24,20 L22.5,18 L22,5 Q24,-5 26,5 L25.5,18 Z"
              fill={`url(#${id}-bladeGradient)`}
              transform="rotate(240 24 20)"
            />
          </g>

          {/* Hub - larger with 3D shading */}
          <circle cx="24" cy="20" r="4" fill={`url(#${id}-hubGradient)`} />
          {/* Hub center detail */}
          <circle cx="24" cy="20" r="1.5" className="fill-card/50" />
        </g>
      </svg>
    </motion.div>
  );
}

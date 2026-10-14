import { motion, AnimatePresence } from 'framer-motion';
import { useId, useState, useEffect } from 'react';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface WindTurbineProps {
  scale?: number;
  speed?: number;
  onClick?: () => void;
}

const TurbinePhrases = [
  'Turbine go brrrr!',
  'Spinning up a storm!',
  'Generating clean electrons!',
  '100% green energy!',
  'Sensing a light breeze!',
  'Harvesting the sky!',
];

export function WindTurbine({ scale = 1, speed = 4, onClick }: WindTurbineProps) {
  const id = useId();
  const { impactLight } = useHaptics({ decorative: true });
  const shouldReduceMotion = useReducedMotion();

  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [showSparks, setShowSparks] = useState(false);

  const handleClick = () => {
    impactLight();

    // Pick random phrase
    const randomPhrase = TurbinePhrases[Math.floor(Math.random() * TurbinePhrases.length)];
    setBubbleText(randomPhrase);

    // Trigger sparks
    if (!shouldReduceMotion) {
      setShowSparks(true);
      setTimeout(() => setShowSparks(false), 1500);
    }

    // Call parent handler (which triggers overdrive speed)
    onClick?.();
  };

  // Auto-hide bubble
  useEffect(() => {
    if (!bubbleText) return;
    const timer = setTimeout(() => {
      setBubbleText(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [bubbleText]);

  // Sparks configuration: 6 particles shooting outwards from the center hub (24, 20)
  const sparkParticles = [
    { x: -15, y: -15, delay: 0 },
    { x: 15, y: -15, delay: 0.1 },
    { x: -20, y: 5, delay: 0.05 },
    { x: 20, y: 5, delay: 0.15 },
    { x: -10, y: 25, delay: 0.2 },
    { x: 10, y: 25, delay: 0.1 },
  ];

  return (
    <motion.div
      className="relative w-12 h-24 z-10 cursor-pointer active:scale-95 transition-transform select-none"
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
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Speech Bubble */}
      <AnimatePresence>
        {bubbleText && (
          <motion.div
            initial={!shouldReduceMotion ? { opacity: 0, scale: 0.8, y: 5 } : { opacity: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={!shouldReduceMotion ? { opacity: 0, scale: 0.8 } : { opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 border border-slate-700/30 text-[9px] font-bold py-1 px-2.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap z-50"
          >
            {bubbleText}
            {/* Small tail pointing down */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/95 dark:bg-slate-100/95 border-r border-b border-slate-700/30 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG Turbine */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 48 96"
        aria-hidden="true"
      >
        {/* Gradient definitions for shading */}
        <defs>
          <linearGradient id={`${id}-towerGradient`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e5e5e5" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#e5e5e5" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`${id}-nacelleGradient`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#f0f0f0" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`${id}-bladeGradient`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f8f8f8" stopOpacity="0.8" />
          </linearGradient>
          <radialGradient id={`${id}-hubGradient`} cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#e0e0e0" stopOpacity="0.9" />
          </radialGradient>
          <radialGradient id={`${id}-towerShadow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="24" cy="94" rx="8" ry="2" fill={`url(#${id}-towerShadow)`} />

        {/* Tower */}
        <polygon points="21.5,24 26.5,24 25,92 23,92" fill={`url(#${id}-towerGradient)`} />
        <rect x="23.5" y="26" width="1" height="64" rx="0.5" className="fill-card/30" />

        {/* Nacelle */}
        <rect x="18" y="17" width="12" height="6" rx="2" fill={`url(#${id}-nacelleGradient)`} />
        <rect x="19" y="19" width="10" height="1" rx="0.5" className="fill-card/20" />

        {/* Red warning light */}
        <motion.circle
          initial={false}
          cx="24"
          cy="15"
          r="1.2"
          className="fill-destructive"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.circle
          initial={false}
          cx="24"
          cy="15"
          r="2.5"
          className="fill-destructive/30"
          animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Rotor with speed drive */}
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

          {/* Three blades */}
          <g>
            <path
              d="M24,20 L22.5,18 L22,5 Q24,-5 26,5 L25.5,18 Z"
              fill={`url(#${id}-bladeGradient)`}
            />
            <path
              d="M24,20 L22.5,18 L22,5 Q24,-5 26,5 L25.5,18 Z"
              fill={`url(#${id}-bladeGradient)`}
              transform="rotate(120 24 20)"
            />
            <path
              d="M24,20 L22.5,18 L22,5 Q24,-5 26,5 L25.5,18 Z"
              fill={`url(#${id}-bladeGradient)`}
              transform="rotate(240 24 20)"
            />
          </g>

          {/* Hub */}
          <circle cx="24" cy="20" r="4" fill={`url(#${id}-hubGradient)`} />
          <circle cx="24" cy="20" r="1.5" className="fill-card/50" />
        </g>

        {/* Overdrive Sparkle Particle Overlay (native SVG rendering) */}
        {showSparks && (
          <g>
            {sparkParticles.map((p, idx) => (
              <motion.circle
                key={idx}
                cx={24}
                cy={20}
                r="1.5"
                fill="#22c55e"
                animate={{
                  cx: [24, 24 + p.x],
                  cy: [20, 20 + p.y],
                  scale: [1, 1.5, 0],
                  opacity: [1, 0.8, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: p.delay,
                  ease: 'easeOut',
                }}
              />
            ))}
          </g>
        )}
      </svg>
    </motion.div>
  );
}

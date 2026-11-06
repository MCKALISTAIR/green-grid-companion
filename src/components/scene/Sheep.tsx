import { useState, useId, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ART, SHEEP_WIDTH, sheepTransform } from '@/lib/sheepLayout';

interface SheepProps {
  /** Feet x and y in the mid-layer SVG units. */
  x: number;
  y: number;
  width?: number;
  isNight: boolean;
  delay?: number;
}

const SheepPhrases = [
  'Ewe could wait for a cleaner hour!',
  'Feeling wool-y green today!',
  'This pasture is powered by wind!',
  'Wind in our wool, please!',
  'Baa-rry clean energy!',
  'I only eat zero-carbon clover!',
];

export function Sheep({ x, y, width = SHEEP_WIDTH, isNight, delay = 0 }: SheepProps) {
  const [isJumping, setIsJumping] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const id = useId();
  const { impactLight: impactMedium } = useHaptics({ decorative: true });
  const shouldReduceMotion = useReducedMotion();

  const handleClick = () => {
    if (isJumping) return;
    setIsJumping(true);
    impactMedium(); // Haptic feedback!

    // Pick random phrase
    const randomPhrase = SheepPhrases[Math.floor(Math.random() * SheepPhrases.length)];
    setBubbleText(randomPhrase);
    setClickCount((prev) => prev + 1);

    setTimeout(() => setIsJumping(false), 1000);
  };

  // Auto-hide bubble
  useEffect(() => {
    if (!bubbleText) return;
    const timer = setTimeout(() => {
      setBubbleText(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [bubbleText, clickCount]);

  const s = width / ART.w;
  const bubbleW = bubbleText ? bubbleText.length * 3.6 + 8 : 0;
  // Keep the bubble inside the 400-unit scene.
  const bubbleX = Math.max(2, Math.min(398 - bubbleW, x - bubbleW / 2));

  return (
    <motion.g
      data-art="sheep"
      className="cursor-pointer select-none"
      style={{ pointerEvents: 'auto' }}
      onClick={handleClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 1 }}
    >
      <g transform={sheepTransform(x, y, width)}>
        {/* Bigger invisible tap target than the 13-unit sheep. */}
        <rect x={-10} y={-14} width={60} height={50} fill="transparent" />
        <motion.g
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          animate={
            isJumping && !shouldReduceMotion
              ? { y: [-10, -35, -5, 0], rotate: [0, 180, 360] }
              : isJumping
                ? { y: [-10, -25, 0] }
                : { y: 0, rotate: 0 }
          }
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Internal Definitions */}
          <defs>
            <radialGradient id={`wool-${id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </radialGradient>
          </defs>

          {/* Legs */}
          <motion.g
            animate={isJumping ? {} : { rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' as const, delay: delay }}
          >
            <rect x="10" y="20" width="3" height="10" rx="1.5" fill="#1e293b" />
            <rect x="25" y="20" width="3" height="10" rx="1.5" fill="#1e293b" />
          </motion.g>

          {/* Body (Fluffy Cloud shape) */}
          <path
            d="M10,15 Q5,5 15,5 Q20,-2 25,5 Q35,0 35,10 Q40,15 35,20 Q30,28 20,25 Q10,28 5,20 Q0,18 10,15 Z"
            fill={`url(#wool-${id})`}
            filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.2))"
          />

          {/* Head */}
          <g transform={isNight ? 'translate(32, 12) rotate(15)' : 'translate(32, 8)'}>
            {/* Face */}
            <ellipse cx="0" cy="0" rx="6" ry="7" fill="#1e293b" />
            {/* Ears */}
            <ellipse cx="-6" cy="-2" rx="4" ry="2" fill="#1e293b" transform="rotate(-30)" />
            <ellipse cx="6" cy="-2" rx="4" ry="2" fill="#1e293b" transform="rotate(30)" />
            {/* Eyes (Open or Closed) */}
            {isNight ? (
              // Sleeping eyes
              <path
                d="M-3,0 Q-1,2 1,0 M3,0 Q5,2 7,0"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
                transform="scale(0.5)"
              />
            ) : (
              // Awake eyes
              <>
                <circle cx="-2" cy="0" r="1.5" fill="white" />
                <circle cx="2" cy="0" r="1.5" fill="white" />
              </>
            )}
          </g>

          {/* Zzz for sleeping */}
          <AnimatePresence>
            {isNight && !isJumping && (
              <motion.g
                initial={{ opacity: 0, y: 0, x: 30 }}
                animate={{ opacity: [0, 1, 0], y: -20, x: 40 }}
                transition={{ duration: 2, repeat: Infinity, delay: delay }}
              >
                <text
                  x="0"
                  y="0"
                  fontSize="10"
                  fill="white"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  Z
                </text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* Reaction "!" when clicked/jumping */}
          <AnimatePresence>
            {isJumping && (
              <motion.text
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: -25, scale: 1.5 }}
                exit={{ opacity: 0 }}
                x="20"
                y="0"
                fontSize="14"
                fill="#22c55e" // Green
                fontWeight="bold"
                textAnchor="middle"
              >
                Bah!
              </motion.text>
            )}
          </AnimatePresence>
        </motion.g>
      </g>

      {/* Speech bubble, in scene units above the sheep. */}
      <AnimatePresence>
        {bubbleText && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.15 : 0.25 }}
            style={{ pointerEvents: 'none' }}
          >
            <rect
              x={bubbleX}
              y={y - 30 * s - 16}
              width={bubbleW}
              height={10}
              rx={2}
              fill="rgba(15,23,42,0.9)"
            />
            <text
              x={bubbleX + bubbleW / 2}
              y={y - 30 * s - 9.2}
              fontSize={6}
              fontWeight="bold"
              fill="white"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              {bubbleText}
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';
import { useState } from 'react';

// 🛸 UFO Component with click-to-abduct-sheep easter egg
export function UFO({ onComplete }: { onComplete: () => void }) {
  const { impactLight } = useHaptics({ decorative: true });
  const [isAbducting, setIsAbducting] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);

  const handleUfoClick = () => {
    if (isAbducting) return;
    impactLight();

    setIsAbducting(true);
    setBubbleText('Abducting sheep...');

    setTimeout(() => {
      setBubbleText('Specimen acquired!');
    }, 1500);

    setTimeout(() => {
      setBubbleText(null);
      setIsAbducting(false);
    }, 3000);
  };

  return (
    <motion.div
      className="absolute top-[15%] z-20 pointer-events-auto cursor-pointer select-none"
      initial={{ x: '-10%', rotate: 10, opacity: 0 }}
      animate={
        isAbducting
          ? {
              // Hover stationary while abducting
              x: '50%',
              y: 10,
              rotate: [0, -5, 5, -5, 0],
              opacity: 1,
            }
          : {
              x: ['-10%', '110%'],
              y: [0, 20, -10, 30, 0], // Bobbing movement
              rotate: [10, -5, 5, -10],
              opacity: [0, 1, 1, 0],
            }
      }
      transition={
        isAbducting
          ? {
              rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.5 },
              x: { type: 'spring', stiffness: 80, damping: 15 },
            }
          : {
              duration: 9,
              ease: 'linear' as const,
            }
      }
      onAnimationComplete={() => {
        if (!isAbducting) onComplete();
      }}
      onClick={handleUfoClick}
    >
      <div className="relative group">
        {/* Speech bubble above UFO */}
        <AnimatePresence>
          {bubbleText && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-cyan-900/90 text-cyan-100 border border-cyan-500/30 text-[9px] font-bold py-0.5 px-2 rounded-full shadow-md pointer-events-none whitespace-nowrap z-50"
            >
              {bubbleText}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saucer Dome */}
        <div className="w-8 h-4 bg-cyan-200/80 rounded-t-full mx-auto border-2 border-cyan-400/50 backdrop-blur-sm" />
        {/* Saucer Body */}
        <div className="w-16 h-6 bg-slate-800 rounded-full -mt-2 border border-slate-600 flex items-center justify-around px-2 shadow-lg shadow-cyan-500/20">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
            />
          ))}
        </div>

        {/* Tractor Beam */}
        <motion.div
          className="absolute top-4 left-1/2 -translate-x-1/2 w-12 bg-gradient-to-b from-cyan-400/40 to-transparent pointer-events-none"
          style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)' }}
          initial={{ opacity: 0, height: 0 }}
          animate={
            isAbducting
              ? {
                  opacity: [0, 0.8, 0.7, 0.8],
                  height: 120,
                }
              : {
                  opacity: [0, 0.4, 0],
                  height: [0, 45, 0],
                }
          }
          transition={
            isAbducting
              ? {
                  opacity: { duration: 0.2, repeat: Infinity, repeatType: 'reverse' },
                  height: { duration: 0.3 },
                }
              : {
                  duration: 3,
                  delay: 3,
                  repeat: 0,
                }
          }
        />

        {/* Abducted Sheep Floating Up */}
        <AnimatePresence>
          {isAbducting && (
            <motion.g
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              initial={{ y: 110, scale: 0.8, opacity: 0, rotate: 0 }}
              animate={{
                y: 8,
                scale: [0.8, 1, 0.2],
                opacity: [0, 1, 1, 0],
                rotate: [0, 90, 360],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
            >
              {/* Tiny Vector Sheep Silhouette */}
              <svg
                width="24"
                height="18"
                viewBox="0 0 40 30"
                fill="none"
                className="absolute left-1/2 -translate-x-1/2"
              >
                <circle cx="20" cy="12" r="8" fill="#e2e8f0" />
                <circle cx="26" cy="12" r="5" fill="#e2e8f0" />
                <circle cx="14" cy="12" r="5" fill="#e2e8f0" />
                <circle cx="20" cy="6" r="5" fill="#e2e8f0" />
                <ellipse cx="32" cy="8" rx="4" ry="5" fill="#1e293b" />
                <rect x="12" y="18" width="2" height="6" fill="#1e293b" />
                <rect x="26" y="18" width="2" height="6" fill="#1e293b" />
              </svg>
            </motion.g>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// 🚁 Electric Delivery Drone
export function ElectricDrone({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      className="absolute top-[25%] z-20 pointer-events-none"
      initial={{ x: '110%', y: 0 }}
      animate={{
        x: '-10%',
        y: [0, -15, 5, -10, 0],
      }}
      transition={{ duration: 6, ease: 'easeInOut' as const }}
      onAnimationComplete={onComplete}
    >
      <div className="relative transform scale-75">
        {/* Rotors */}
        <motion.div
          className="absolute -top-2 -left-2 w-12 h-1 bg-slate-400/50 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.1, repeat: Infinity, ease: 'linear' as const }}
        />
        <motion.div
          className="absolute -top-2 -right-2 w-12 h-1 bg-slate-400/50 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 0.1, repeat: Infinity, ease: 'linear' as const }}
        />

        {/* Body */}
        <div className="w-10 h-6 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
          <div className="w-8 h-4 bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-[8px] font-bold text-green-700">EV</span>
          </div>
        </div>

        {/* Package */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-4 bg-amber-700 rounded-sm shadow-sm" />
      </div>
    </motion.div>
  );
}

// 🚂 Steam Train (Silhouette)
export function SteamTrain({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      className="absolute bottom-16 z-0 pointer-events-none opacity-60"
      initial={{ x: '-20%' }}
      animate={{ x: '120%' }}
      transition={{ duration: 25, ease: 'linear' as const }}
      onAnimationComplete={onComplete}
    >
      <div className="flex items-end gap-0.5 transform scale-75 filter blur-[0.5px]">
        {/* Locomotive */}
        <div className="relative w-12 h-10 bg-slate-800 rounded-sm">
          <div className="absolute -top-4 right-2 w-3 h-6 bg-slate-800" /> {/* Funnel */}
          {/* Smoke Puffs */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute -top-6 right-2 w-4 h-4 rounded-full bg-slate-500/50"
              initial={{ opacity: 0, scale: 0.5, y: 0, x: 0 }}
              animate={{ opacity: [0.8, 0], scale: 2, y: -40, x: -20 - i * 5 }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>
        {/* Coal Car */}
        <div className="w-8 h-6 bg-slate-800 rounded-sm" />
        {/* Passenger Cars */}
        <div className="w-14 h-8 bg-slate-800 rounded-sm" />
        <div className="w-14 h-8 bg-slate-800 rounded-sm" />
      </div>
    </motion.div>
  );
}

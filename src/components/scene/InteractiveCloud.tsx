import { useState } from 'react';
import { Cloud } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';

interface InteractiveCloudProps {
  className?: string;
  style?: React.CSSProperties;
  shouldReduceMotion: boolean;
}

export function InteractiveCloud({ className, style, shouldReduceMotion }: InteractiveCloudProps) {
  const [isPuffed, setIsPuffed] = useState(false);
  const { impactLight } = useHaptics({ decorative: true });

  const handleTap = () => {
    if (isPuffed) return;
    setIsPuffed(true);
    impactLight();
    setTimeout(() => setIsPuffed(false), 800);
  };

  return (
    <motion.div
      className={`${className} pointer-events-auto cursor-pointer`}
      style={style}
      onClick={handleTap}
      whileHover={!shouldReduceMotion ? { scale: 1.08, y: -2 } : {}}
      animate={
        isPuffed && !shouldReduceMotion
          ? {
              scale: [1, 1.25, 0.75, 1.1, 1],
              rotate: [0, -8, 8, -4, 0],
            }
          : {}
      }
      transition={{ duration: 0.8, ease: 'easeInOut' as const }}
    >
      <Cloud className="w-full h-full transition-colors duration-200 hover:text-sky-50/90" aria-hidden="true" />
    </motion.div>
  );
}

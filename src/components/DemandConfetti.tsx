import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ConfettiPiece {
  id: number;
  x: number; // initial left %
  y: number; // initial top %
  color: string;
  angle: number;
  scale: number;
  rotateSpeed: number;
  driftSpeed: number;
  fallSpeed: number;
}

const COLORS = ['#22c55e', '#4ade80', '#86efac', '#eab308', '#fef08a', '#10b981'];

export function DemandConfetti() {
  const shouldReduceMotion = useReducedMotion();
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (shouldReduceMotion) return;

    // Generate 60 pieces
    const generated = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: 35 + Math.random() * 30, // center-ish explosion area
      y: 10 + Math.random() * 15,
      color: COLORS[i % COLORS.length],
      angle: Math.random() * 360,
      scale: 0.4 + Math.random() * 0.8,
      rotateSpeed: 180 + Math.random() * 360,
      driftSpeed: (Math.random() - 0.5) * 120,
      fallSpeed: 200 + Math.random() * 150,
    }));
    setPieces(generated);

    // Auto-clean after 4 seconds
    const timer = setTimeout(() => {
      setPieces([]);
    }, 4500);

    return () => clearTimeout(timer);
  }, [shouldReduceMotion]);

  if (shouldReduceMotion || pieces.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {pieces.map((p) => {
        const drift = p.driftSpeed;
        const fall = 600 + Math.random() * 200; // fall down past viewport

        return (
          <motion.div
            key={p.id}
            className="absolute w-2 h-4 rounded-sm"
            style={{
              backgroundColor: p.color,
              left: `${p.x}%`,
              top: `${p.y}%`,
              scale: p.scale,
            }}
            initial={{ opacity: 1, y: 0, x: 0, rotate: p.angle }}
            animate={{
              opacity: 0,
              y: fall,
              x: drift,
              rotate: p.angle + p.rotateSpeed,
            }}
            transition={{
              duration: 3.2 + Math.random() * 1.2,
              ease: [0.1, 0.8, 0.3, 1], // natural deceleration and gravity
            }}
          />
        );
      })}
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Particle {
  id: number;
  angle: number;
  distance: number;
  color: string;
}

interface RenewableSparkleProps {
  /** Set to true to fire the burst; parent should reset after onComplete */
  trigger: boolean;
  onComplete?: () => void;
}

const COLORS = ['#4ade80', '#86efac', '#facc15', '#34d399', '#a3e635', '#6ee7b7'];
const PARTICLE_COUNT = 10;

function buildParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: (i / PARTICLE_COUNT) * 360 + Math.random() * 20 - 10,
    distance: 22 + Math.random() * 16,
    color: COLORS[i % COLORS.length],
  }));
}

export function RenewableSparkle({ trigger, onComplete }: RenewableSparkleProps) {
  const shouldReduceMotion = useReducedMotion();
  const particlesRef = useRef<Particle[]>(buildParticles());

  useEffect(() => {
    if (trigger) {
      particlesRef.current = buildParticles();
    }
  }, [trigger]);

  if (shouldReduceMotion) return null;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {trigger && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {particlesRef.current.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.distance;
            const ty = Math.sin(rad) * p.distance;
            return (
              <motion.div
                key={p.id}
                className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color, marginLeft: -4, marginTop: -4 }}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: 0, scale: 1.4, x: tx, y: ty }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.65,
                  ease: [0.2, 0.8, 0.4, 1],
                  delay: p.id * 0.015,
                }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

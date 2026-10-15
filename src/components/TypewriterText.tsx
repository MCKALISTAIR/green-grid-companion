import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface TypewriterTextProps {
  text: string;
  className?: string;
}

/**
 * Band word: static text that fades in (200ms) when it changes.
 * Replaces the old typewriter, whose caret never left (art pass v1 §8).
 * Reduced motion renders it straight away.
 */
export function TypewriterText({ text, className }: TypewriterTextProps) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <span className={className}>{text}</span>;
  return (
    <motion.span
      key={text}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {text}
    </motion.span>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface TypewriterTextProps {
  text: string;
  /** ms between characters, default 48 */
  charDelay?: number;
  className?: string;
}

export function TypewriterText({ text, charDelay = 48, className }: TypewriterTextProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(shouldReduceMotion ? text : '');
  const [showCursor, setShowCursor] = useState(!shouldReduceMotion);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayed(text);
      setShowCursor(false);
      return;
    }

    // Text changed — reset and retype
    setDisplayed('');
    setShowCursor(true);
    prevTextRef.current = text;

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        // Hide cursor 800ms after typing completes
        setTimeout(() => setShowCursor(false), 800);
      }
    }, charDelay);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, charDelay]);

  return (
    <span className={className}>
      {displayed}
      <AnimatePresence>
        {showCursor && (
          <motion.span
            key="cursor"
            className="inline-block ml-px w-[2px] h-[1em] align-middle bg-current rounded-sm"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' as const }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </span>
  );
}

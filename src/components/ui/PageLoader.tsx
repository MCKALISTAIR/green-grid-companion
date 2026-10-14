import { motion } from 'framer-motion';
import { readTone } from '@/lib/tone';
import { TurbineSpinner } from './turbine-spinner';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { quickFade } from '@/lib/motion';
import { cn } from '@/lib/utils';

// Loading tips were removed (11 Oct 2026): their stats had no sources.
// Add them back only with a cited source per line.

const LOADER_COPY = {
  cheeky: { title: 'Checking your grid…', detail: 'Fetching the latest half hour.' },
  plain: { title: 'Loading grid data…', detail: 'Fetching the latest half hour.' },
} as const;

interface PageLoaderProps {
  message?: string;
  fullscreen?: boolean;
}

export function PageLoader({ message, fullscreen = false }: PageLoaderProps) {
  const copy = LOADER_COPY[readTone()];
  const shouldReduceMotion = useReducedMotion();

  const containerClasses = fullscreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-background/80 backdrop-blur-md'
    : 'flex flex-col items-center justify-center p-8 w-full min-h-[min(60dvh,420px)]';

  return (
    <motion.div
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-label="Loading carbon intensity"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={quickFade}
    >
      <div className="flex flex-col items-center max-w-sm text-center gap-6">
        <div className="relative flex items-center justify-center w-24 h-24">
          {!shouldReduceMotion && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/20 bg-primary/5"
                animate={{
                  scale: [0.9, 1.15, 0.9],
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border border-primary/10 bg-primary/2"
                animate={{
                  scale: [1.1, 0.85, 1.1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </>
          )}

          <TurbineSpinner
            size="lg"
            className={cn(
              'z-10 text-primary relative',
              !shouldReduceMotion && 'filter drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]',
            )}
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {message || copy.title}
          </h3>
          <p
            className={cn('text-xs text-muted-foreground', !shouldReduceMotion && 'animate-pulse')}
          >
            {copy.detail}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

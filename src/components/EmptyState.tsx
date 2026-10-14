import { LucideIcon, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useOffline } from '@/hooks/useOffline';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  fullScreen?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  fullScreen = false,
}: EmptyStateProps) {
  const { isOffline } = useOffline();

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${fullScreen ? 'min-h-[60vh]' : 'py-12'}`}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' as const }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="w-10 h-10 text-muted-foreground/60" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-2 flex flex-col items-center"
      >
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground max-w-sm leading-relaxed">{description}</p>
        {isOffline && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-md">
            <WifiOff className="w-4 h-4" />
            <span>You&apos;re offline. We&apos;ll fetch this when you&apos;re back.</span>
          </div>
        )}
      </motion.div>

      {action && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6"
        >
          {action}
        </motion.div>
      )}
    </div>
  );
}

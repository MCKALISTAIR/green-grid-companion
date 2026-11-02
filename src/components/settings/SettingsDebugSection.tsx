import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { settingsItemVariants } from './settingsMotion';
import { SettingsSectionHeading } from './SettingsSectionHeading';

export function SettingsDebugSection() {
  return (
    <motion.div variants={settingsItemVariants} className="border-t border-border pt-8 pb-4">
      <SettingsSectionHeading className="mb-4 px-1">Debug</SettingsSectionHeading>
      <div className="sheet-surface p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Test Error Tracking</h3>
            <p className="text-sm text-muted-foreground">Sends a test error to Sentry</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              try {
                throw new Error('This is a test error from GridSense Settings');
              } catch (error) {
                console.error('Test error triggered', error);
                logger.error('Test error triggered by user', { error });
                toast.success('Error logged to Sentry successfully');
              }
              import('@sentry/react')
                .then((Sentry) => {
                  Sentry.captureMessage('Test Message from GridSense Settings');
                })
                .catch((err) => {
                  console.error('Failed to import Sentry:', err);
                  toast.error('Failed to load error tracking');
                });
            }}
          >
            <Zap className="w-4 h-4 mr-2" />
            Trigger Error
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

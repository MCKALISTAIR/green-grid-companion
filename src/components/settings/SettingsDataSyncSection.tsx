import { Cloud, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { settingsItemVariants } from './settingsMotion';
import { SettingsSectionHeading } from './SettingsSectionHeading';

interface SettingsDataSyncSectionProps {
  gridLastUpdated: string | Date | null | undefined;
  refetchGrid: () => void;
  isGridFetching: boolean;
  isOffline: boolean;
}

export function SettingsDataSyncSection({
  gridLastUpdated,
  refetchGrid,
  isGridFetching,
  isOffline,
}: SettingsDataSyncSectionProps) {
  return (
    <motion.div variants={settingsItemVariants} className="space-y-4">
      <SettingsSectionHeading>Data Sync</SettingsSectionHeading>
      <div className="sheet-surface p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Cloud className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Grid Network Data</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              Last checked:{' '}
              {gridLastUpdated ? new Date(gridLastUpdated).toLocaleTimeString() : 'Unknown'}
              {isOffline && (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-100 text-amber-800 border-amber-200"
                >
                  Offline
                </Badge>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchGrid();
            toast.info('Checking for new data...');
          }}
          disabled={isGridFetching || isOffline}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isGridFetching ? 'animate-spin' : ''}`} />
          Force Refresh
        </Button>
      </div>
    </motion.div>
  );
}

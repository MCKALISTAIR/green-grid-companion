import { Link } from 'react-router-dom';
import {
  ChevronRight,
  GraduationCap,
  History,
  MessageSquare,
  Shield,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { settingsItemVariants } from './settingsMotion';
import { SettingsSectionHeading } from './SettingsSectionHeading';

interface SettingsResourcesSectionProps {
  hasNewVersion: boolean;
  onShowYearWrapped: () => void;
}

export function SettingsResourcesSection({
  hasNewVersion,
  onShowYearWrapped,
}: SettingsResourcesSectionProps) {
  return (
    <motion.div variants={settingsItemVariants} className="space-y-4">
      <SettingsSectionHeading>Resources</SettingsSectionHeading>

      <div className="flex flex-col gap-3">
        {new Date().getMonth() === 11 && (
          <button onClick={onShowYearWrapped}>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-chart-4/10 border border-primary/20 rounded-lg hover:from-primary/20 hover:to-chart-4/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-full">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">{new Date().getFullYear()} Grid Wrapped</h3>
                  <p className="text-sm text-muted-foreground">Your year in UK electricity</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                New
              </Badge>
            </div>
          </button>
        )}

        <Link to="/feature-guides">
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
            className="flex items-center justify-between sheet-surface p-4 hover:bg-muted/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Feature Guides</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed how-to guides for each feature
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </Link>

        <Link to="/help">
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
            className="flex items-center justify-between sheet-surface p-4 hover:bg-muted/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Help & Tips</h3>
                <p className="text-sm text-muted-foreground">Quick answers & FAQs</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </Link>

        <Link to="/glossary">
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
            className="flex items-center justify-between sheet-surface p-4 hover:bg-muted/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Energy Literacy</h3>
                <p className="text-sm text-muted-foreground">Learn about fuel types & terms</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </Link>

        <Link to="/changelog">
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
            className="flex items-center justify-between sheet-surface p-4 hover:bg-muted/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full relative">
                <History className="w-5 h-5 text-primary" />
                {hasNewVersion && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-medium">What's New</h3>
                  <p className="text-sm text-muted-foreground">View changelog & version history</p>
                </div>
                {hasNewVersion && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                    New
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </Link>

        <Link to="/privacy">
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
            className="flex items-center justify-between sheet-surface p-4 hover:bg-muted/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-full">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">Privacy Policy</h3>
                <p className="text-sm text-muted-foreground">How we handle your data</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}

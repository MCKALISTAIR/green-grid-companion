import { Link } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { settingsItemVariants } from './settingsMotion';
import { SettingsSectionHeading } from './SettingsSectionHeading';

export function SettingsBadgesSection() {
  return (
    <motion.div variants={settingsItemVariants} className="space-y-4">
      <SettingsSectionHeading className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        Badges
      </SettingsSectionHeading>
      <Link to="/achievements">
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
          className="sheet-surface flex items-center justify-between p-4 bg-primary/5 border-primary/20 hover:bg-primary/10 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Trophy Room</h3>
              <p className="text-sm text-muted-foreground">View your unlocked achievements</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </Link>
    </motion.div>
  );
}

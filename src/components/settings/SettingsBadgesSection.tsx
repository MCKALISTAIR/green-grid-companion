import { Link } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { settingsItemVariants } from './settingsMotion';

export function SettingsBadgesSection() {
  return (
    <motion.div variants={settingsItemVariants} className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        Badges
      </h2>
      <Link to="/achievements">
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
          className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg hover:from-primary/15 hover:to-primary/10 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
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

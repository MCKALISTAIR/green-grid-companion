import { ChevronRight, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { settingsItemVariants } from './settingsMotion';

export function SettingsSupportSection() {
  return (
    <motion.div variants={settingsItemVariants} className="space-y-4">
      <h2 className="text-xl font-semibold">Support</h2>

      <div className="flex flex-col gap-3">
        <a href="mailto:allymckay5@gmail.com?subject=GridSense%20Feedback">
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
            className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Send Feedback</h3>
                <p className="text-sm text-muted-foreground">Report bugs or suggest features</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </a>
      </div>
    </motion.div>
  );
}

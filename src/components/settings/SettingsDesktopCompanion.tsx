import { openExternal } from '@/lib/openExternal';
import { Download, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { settingsItemVariants } from './settingsMotion';
import { SettingsSectionHeading } from './SettingsSectionHeading';

export function SettingsDesktopCompanion() {
  return (
    <motion.div variants={settingsItemVariants} className="space-y-4">
      <SettingsSectionHeading>Desktop Companion</SettingsSectionHeading>
      <div className="p-4 bg-gradient-to-br from-card to-accent/5 border rounded-lg space-y-3 relative overflow-hidden">
        <Monitor className="absolute -right-4 -bottom-4 w-24 h-24 text-accent/10 rotate-[-15deg]" />

        <div className="flex items-start gap-3 relative z-10">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Monitor className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-base">GridSense Menu Bar</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Keep an eye on the grid from your Mac. The menu bar app shows the live number and
              what&apos;s coming up.
            </p>
          </div>
        </div>

        <div className="pt-2 relative z-10">
          <Button
            className="w-full sm:w-auto gap-2 shadow-sm"
            onClick={() =>
              void openExternal('https://github.com/MCKALISTAIR/green-grid-companion/releases')
            }
          >
            <Download className="w-4 h-4" />
            Download for macOS
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2 text-center sm:text-left">
            Requires macOS 11.0 or later.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 bg-accent/20 p-2 rounded border border-accent/10 max-w-md text-center sm:text-left">
            💡 <strong>Tip:</strong> To show your local region in the menu bar app, create a file at{' '}
            <code>~/.gridsense</code> containing your postcode prefix (e.g., <code>EH1</code> or{' '}
            <code>SW1</code>).
          </p>
        </div>
      </div>
    </motion.div>
  );
}

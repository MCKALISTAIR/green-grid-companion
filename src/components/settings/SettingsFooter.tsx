import { Construction } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { VERSION_STRING } from '@/lib/version';
import { settingsItemVariants } from './settingsMotion';

interface SettingsFooterProps {
  isLinked: boolean;
  isTeslaLinked: boolean;
  unlocked: boolean;
  onVersionClick: () => void;
}

export function SettingsFooter({
  isLinked,
  isTeslaLinked,
  unlocked,
  onVersionClick,
}: SettingsFooterProps) {
  return (
    <motion.div variants={settingsItemVariants} className="text-xs text-muted-foreground text-center space-y-2 pt-8 pb-4">
      <p>
        Developed by{' '}
        <a
          href="https://alistair-mckay.lovable.app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          Alistair McKay
        </a>
      </p>
      <p>
        Carbon data from{' '}
        <a
          href="https://www.carbonintensity.org.uk/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          National Grid ESO
        </a>
      </p>
      {isLinked && (
        <p>
          Footprint data powered by{' '}
          <a
            href="https://developer.octopus.energy/docs/api/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Octopus Energy API
          </a>
        </p>
      )}
      {isTeslaLinked && (
        <p>
          Vehicle & Energy data powered by{' '}
          <a
            href="https://developer.tesla.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Tesla Fleet API
          </a>
        </p>
      )}
      <div className="pt-2 flex flex-col items-center gap-1">
        <span
          onClick={(e) => {
            e.preventDefault();
            onVersionClick();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onVersionClick();
            }
          }}
          className="bg-transparent border-0 p-0 text-primary hover:underline cursor-pointer select-none"
          role="button"
          aria-label="Tap version number multiple times to unlock developer features"
          tabIndex={0}
        >
          {VERSION_STRING}
        </span>
        {unlocked && (
          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500 gap-1 mt-1 animate-in fade-in zoom-in">
            <Construction className="w-3 h-3" />
            Director Mode Unlocked
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

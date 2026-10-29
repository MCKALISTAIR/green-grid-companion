import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VERSION_STRING, BUILD_DATE } from '@/lib/version';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { Sparkles, Zap, Bug, Wrench, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 25 } },
};

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix' | 'technical' | 'track' | 'location';
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: 'v1.6.0',
    date: new Date().toISOString().split('T')[0],
    title: 'Performance & Playful Motion',
    changes: [
      {
        type: 'feature',
        description: 'Bouncier animations, including the fact bubbles',
      },
      {
        type: 'feature',
        description: 'Onboarding scenes now change as you go through setup',
      },
      {
        type: 'improvement',
        description: 'Smoother transitions as pages load',
      },
      {
        type: 'improvement',
        description: "We now save location lookups so we don't hit service limits",
      },
      {
        type: 'improvement',
        description: 'Energy facts no longer repeat back to back',
      },
      {
        type: 'technical',
        description: "Slimmed down the app's code: the main bundle is 38% smaller",
      },
      {
        type: 'technical',
        description: 'Smaller icons, saving 855KB',
      },
    ],
  },
  {
    version: 'v1.5.0',
    date: '2026-07-18',
    title: 'Desktop Companion & Sync',
    changes: [
      { type: 'feature', description: 'macOS Menu Bar App: Live intensity in your menu bar' },
      { type: 'feature', description: 'Cloud Sync: Back up your data with Apple/Google sign-in' },
      { type: 'feature', description: 'Enhanced Onboarding: House type selection & welcome tour' },
      { type: 'improvement', description: 'Interactive Product Tour for new users' },
      { type: 'improvement', description: 'A nicer welcome back for Octopus users' },
    ],
  },
  {
    version: 'v1.4.1',
    date: '2026-02-04',
    title: 'Polish & Stability',
    changes: [
      { type: 'fix', description: 'Fixed scene layout stretching and height issues' },
      { type: 'improvement', description: 'Improved commentary text alignment' },
      { type: 'fix', description: 'Resolved "Grid Malfunction" crash' },
      { type: 'fix', description: 'Fixed the intensity card hiding on small screens' },
    ],
  },
  {
    version: 'v1.4.0',
    date: new Date().toISOString().split('T')[0],
    title: 'Gamification & Time Travel',
    changes: [
      { type: 'feature', description: 'Grid Time Machine: Explore historical carbon data' },
      {
        type: 'feature',
        description: 'Grid Guardian Achievements: Unlock badges for green habits',
      },
      { type: 'feature', description: 'Secret Builder Mode: Customise your home scene' },
      { type: 'feature', description: 'Vintage filter for historical charts' },
      { type: 'improvement', description: 'New "Badges" section in Settings' },
    ],
  },
  {
    version: 'v1.2.1',
    date: '2026-01-29',
    title: 'Reliability & Onboarding',
    changes: [
      { type: 'feature', description: 'New Onboarding flow with notification permissions' },
      { type: 'feature', description: 'Better crash reporting (Sentry)' },
      { type: 'technical', description: 'Version numbers now stay in sync' },
      { type: 'fix', description: 'Fixed iOS notification permission configuration' },
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-01-29',
    title: 'Seamless Data Updates',
    changes: [
      {
        type: 'feature',
        description: 'Refreshes in the background when NESO publishes new figures',
      },
      { type: 'feature', description: 'Animated intensity counter with directional indicators' },
      {
        type: 'improvement',
        description: 'Removed the "Waiting..." label. Data updates quietly',
      },
      { type: 'improvement', description: 'Haptic feedback on intensity changes (iOS)' },
      { type: 'fix', description: 'Fixed sign-in errors when logged out' },
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-01-23',
    title: 'Carbon Footprint Tracking',
    changes: [
      { type: 'feature', description: 'Octopus Energy integration for smart meter data' },
      { type: 'feature', description: 'Personal carbon footprint tracking with charts' },
      { type: 'feature', description: 'Green Score with achievements' },
      { type: 'feature', description: 'Weekly digest notifications' },
      { type: 'improvement', description: 'Improved data caching for faster loading' },
    ],
  },
  {
    version: 'v0.9.0',
    date: '2026-01-21',
    title: 'Dynamic Visual Scene',
    changes: [
      { type: 'feature', description: 'Interactive intensity scene with day/night cycle' },
      { type: 'feature', description: 'Real-time weather effects synced via Open-Meteo API' },
      { type: 'feature', description: 'Parallax depth layers with mountains and grass' },
      { type: 'improvement', description: 'High intensity shows factories, low shows renewables' },
      { type: 'improvement', description: 'Better layout on desktop' },
    ],
  },
  {
    version: 'v0.8.0',
    date: '2026-01-16',
    title: 'Enhanced Forecasting',
    changes: [
      { type: 'feature', description: 'Forecast vs actual comparison' },
      { type: 'feature', description: 'Power Planner: best times to run things' },
      { type: 'improvement', description: 'Loading placeholders, so screens feel quicker' },
      { type: 'fix', description: 'Fixed forecast chart timezone issues' },
    ],
  },
  {
    version: 'v0.1.0',
    date: '2025-10-01',
    title: 'Initial Release',
    changes: [
      { type: 'feature', description: 'Real-time carbon intensity display' },
      { type: 'feature', description: '48-hour forecast chart' },
      { type: 'feature', description: 'Best time to use energy recommendations' },
      { type: 'location', description: 'Location-based regional data' },
    ],
  },
];

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
};

const typeConfig = {
  feature: { icon: Sparkles, label: 'New', color: 'bg-primary/10 text-primary border-primary/20' },
  track: { icon: Sparkles, label: 'New', color: 'bg-primary/10 text-primary border-primary/20' },
  location: { icon: Sparkles, label: 'New', color: 'bg-primary/10 text-primary border-primary/20' },
  improvement: {
    icon: Zap,
    label: 'Improved',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  fix: {
    icon: Bug,
    label: 'Fixed',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  },
  technical: {
    icon: Wrench,
    label: 'Technical',
    color: 'bg-muted text-muted-foreground border-border',
  },
};

export default function Changelog() {
  const { markVersionSeen } = useVersionCheck();

  // Mark version as seen when user visits the changelog
  useEffect(() => {
    markVersionSeen();
  }, [markVersionSeen]);

  return (
    <div className="page-shell page-shell--fit">
      <div className="page-shell-inner space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="shrink-0" aria-label="Back to settings">
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Changelog</h1>
            <p className="text-sm text-muted-foreground">Current: {VERSION_STRING}</p>
          </div>
        </div>

        {/* Changelog entries */}
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {changelog.map((entry, index) => (
            <motion.div
              key={entry.version}
              variants={itemVariants}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
            >
              <Card className="p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-foreground">{entry.version}</h2>
                      {index === 0 && (
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20 text-[10px]"
                        >
                          Latest
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-primary mt-0.5">{entry.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                </div>

                <ul className="space-y-2">
                  {entry.changes.map((change, changeIndex) => {
                    const config = typeConfig[change.type] || typeConfig.feature;
                    const Icon = config.icon;
                    return (
                      <li key={changeIndex} className="flex items-start gap-2 text-sm">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Badge
                            variant="outline"
                            className={`${config.color} text-[10px] px-1.5 py-0 h-5 shrink-0 mt-0.5`}
                          >
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </motion.div>
                        <span className="text-muted-foreground">{change.description}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>We keep improving GridSense based on your feedback.</p>
          <p className="mt-1">Built: {BUILD_DATE}</p>
        </div>
      </div>
    </div>
  );
}

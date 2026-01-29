import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VERSION_STRING, BUILD_DATE } from '@/lib/version';
import { 
  Sparkles, 
  Zap, 
  Bug, 
  Wrench,
  ChevronLeft,
  Car,
  Leaf,
  Bell,
  BarChart3,
  Clock,
  Gauge
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix' | 'technical';
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: 'v1.2.0',
    date: '2026-01-29',
    title: 'Seamless Data Updates',
    changes: [
      { type: 'feature', description: 'Smart background refresh synced to National Grid update schedule' },
      { type: 'feature', description: 'Animated intensity counter with directional indicators' },
      { type: 'improvement', description: 'Removed "Waiting..." label - data now updates silently' },
      { type: 'improvement', description: 'Haptic feedback on intensity changes (iOS)' },
      { type: 'fix', description: 'Fixed 401 errors when not logged in' },
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-01-22',
    title: 'Tesla Integration',
    changes: [
      { type: 'feature', description: 'Complete Tesla integration for Vehicles and Energy Sites' },
      { type: 'feature', description: 'View real-time battery level, charging status, and range' },
      { type: 'feature', description: 'Monitor Solar and Powerwall status' },
      { type: 'feature', description: 'Track carbon saved vs average grid intensity' },
      { type: 'improvement', description: 'Secure OAuth linking with official Tesla login' },
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-01-15',
    title: 'Carbon Footprint Tracking',
    changes: [
      { type: 'feature', description: 'Octopus Energy integration for smart meter data' },
      { type: 'feature', description: 'Personal carbon footprint tracking with charts' },
      { type: 'feature', description: 'Green Energy Score with achievements' },
      { type: 'feature', description: 'Weekly digest notifications' },
      { type: 'improvement', description: 'Improved data caching for faster loading' },
    ],
  },
  {
    version: 'v0.9.0',
    date: '2026-01-08',
    title: 'Enhanced Forecasting',
    changes: [
      { type: 'feature', description: 'Comparative forecast view with actual vs predicted' },
      { type: 'feature', description: 'Power Planner for optimal usage timing' },
      { type: 'improvement', description: 'Skeleton loaders for better perceived performance' },
      { type: 'fix', description: 'Fixed forecast chart timezone issues' },
    ],
  },
  {
    version: 'v0.8.0',
    date: '2025-12-20',
    title: 'Dynamic Visual Scene',
    changes: [
      { type: 'feature', description: 'Interactive intensity scene with day/night cycle' },
      { type: 'feature', description: 'Real-time weather effects synced via Open-Meteo API' },
      { type: 'feature', description: 'Parallax depth layers with mountains and grass' },
      { type: 'improvement', description: 'High intensity shows factories, low shows renewables' },
    ],
  },
  {
    version: 'v0.7.0',
    date: '2025-12-10',
    title: 'Push Notifications',
    changes: [
      { type: 'feature', description: 'Low intensity alerts when grid is clean' },
      { type: 'feature', description: 'Daily forecast notifications' },
      { type: 'feature', description: 'Monthly carbon report summaries' },
      { type: 'technical', description: 'Edge functions for scheduled notifications' },
    ],
  },
  {
    version: 'v0.6.0',
    date: '2025-12-01',
    title: 'UK Regional Map',
    changes: [
      { type: 'feature', description: 'Interactive map showing all UK regions' },
      { type: 'feature', description: 'Regional carbon intensity leaderboard' },
      { type: 'improvement', description: 'Quick region switching' },
    ],
  },
  {
    version: 'v0.5.0',
    date: '2025-11-15',
    title: 'Historical Data',
    changes: [
      { type: 'feature', description: 'View past carbon intensity data' },
      { type: 'feature', description: 'Generation mix breakdown charts' },
      { type: 'improvement', description: 'Date range selector for history' },
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
      { type: 'feature', description: 'Location-based regional data' },
    ],
  },
];

const typeConfig = {
  feature: { icon: Sparkles, label: 'New', color: 'bg-primary/10 text-primary border-primary/20' },
  improvement: { icon: Zap, label: 'Improved', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  fix: { icon: Bug, label: 'Fixed', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  technical: { icon: Wrench, label: 'Technical', color: 'bg-muted text-muted-foreground border-border' },
};

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="p-4 pt-[calc(env(safe-area-inset-top)+1rem)] space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Changelog</h1>
            <p className="text-sm text-muted-foreground">
              Current: {VERSION_STRING}
            </p>
          </div>
        </div>

        {/* Changelog entries */}
        <div className="space-y-4">
          {changelog.map((entry, index) => (
            <Card key={entry.version} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-foreground">{entry.version}</h2>
                    {index === 0 && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                        Latest
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-primary mt-0.5">{entry.title}</p>
                </div>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              
              <ul className="space-y-2">
                {entry.changes.map((change, changeIndex) => {
                  const config = typeConfig[change.type];
                  const Icon = config.icon;
                  return (
                    <li key={changeIndex} className="flex items-start gap-2 text-sm">
                      <Badge 
                        variant="outline" 
                        className={`${config.color} text-[10px] px-1.5 py-0 h-5 shrink-0 mt-0.5`}
                      >
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      <span className="text-muted-foreground">{change.description}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>GridSense is continuously improved based on user feedback.</p>
          <p className="mt-1">Built: {BUILD_DATE}</p>
        </div>
      </div>
    </div>
  );
}

import { Activity, Leaf, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export type DashboardViewMode = 'intensity' | 'footprint' | 'demand';

interface DashboardViewTabsProps {
  viewMode: DashboardViewMode;
  onViewModeChange: (mode: DashboardViewMode) => void;
  onSelectionHaptic: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

function TabButton({
  mode,
  label,
  icon,
  viewMode,
  onSelect,
  dataTour,
}: {
  mode: DashboardViewMode;
  label: string;
  icon: React.ReactNode;
  viewMode: DashboardViewMode;
  onSelect: () => void;
  dataTour?: string;
}) {
  const isActive = viewMode === mode;

  return (
    <Button
      variant="ghost"
      role="tab"
      tabIndex={isActive ? 0 : -1}
      aria-selected={isActive}
      aria-controls="dashboard-tabpanel"
      className={`relative flex-1 min-w-0 min-h-11 h-11 p-0 rounded-xl text-[11px] sm:text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 z-10 ${
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
      onClick={onSelect}
      data-tour={dataTour}
    >
      {isActive && (
        <motion.div
          layoutId="dashboard-view-pill"
          className="absolute inset-0 bg-primary/10 border border-primary/15 shadow-sm rounded-xl"
          transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative z-20 flex items-center justify-center gap-1 sm:gap-2 h-full px-0.5 truncate">
        <motion.span
          key={isActive ? 'active' : 'inactive'}
          className="shrink-0"
          initial={isActive ? { scale: 1.3 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
        >
          {icon}
        </motion.span>
        <span className="truncate">{label}</span>
      </span>
    </Button>
  );
}

export function DashboardViewTabs({
  viewMode,
  onViewModeChange,
  onSelectionHaptic,
  onKeyDown,
}: DashboardViewTabsProps) {
  const select = (mode: DashboardViewMode) => {
    onSelectionHaptic();
    onViewModeChange(mode);
  };

  return (
    <div
      role="tablist"
      aria-label="Dashboard Views"
      onKeyDown={onKeyDown}
      className="relative flex p-1.5 bg-muted/80 rounded-2xl overflow-hidden select-none border border-border/40"
    >
      <TabButton
        mode="intensity"
        label="Intensity"
        icon={<Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        viewMode={viewMode}
        onSelect={() => select('intensity')}
      />
      <TabButton
        mode="demand"
        label="Demand"
        icon={<Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        viewMode={viewMode}
        onSelect={() => select('demand')}
      />
      <TabButton
        mode="footprint"
        label="Footprint"
        icon={<Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        viewMode={viewMode}
        onSelect={() => select('footprint')}
        dataTour="view-footprint"
      />
    </div>
  );
}

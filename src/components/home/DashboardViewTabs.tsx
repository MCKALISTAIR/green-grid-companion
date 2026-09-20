import { Activity, Leaf, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <button
      role="tab"
      tabIndex={isActive ? 0 : -1}
      aria-selected={isActive}
      aria-controls="dashboard-tab-content"
      className={`relative flex-1 min-w-[100px] h-9 rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 z-10 ${
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
      <span className="relative z-20 flex items-center justify-center h-full">
        <motion.span
          key={isActive ? 'active' : 'inactive'}
          initial={isActive ? { scale: 1.3 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
        >
          {icon}
        </motion.span>
        {label}
      </span>
    </button>
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
        icon={<Activity className="w-4 h-4 mr-2" />}
        viewMode={viewMode}
        onSelect={() => select('intensity')}
      />
      <TabButton
        mode="demand"
        label="Demand"
        icon={<Zap className="w-4 h-4 mr-2" />}
        viewMode={viewMode}
        onSelect={() => select('demand')}
      />
      <TabButton
        mode="footprint"
        label="Footprint"
        icon={<Leaf className="w-4 h-4 mr-2" />}
        viewMode={viewMode}
        onSelect={() => select('footprint')}
        dataTour="view-footprint"
      />
    </div>
  );
}

import { Flame, Sun, Atom, Droplets, Leaf, Mountain, ArrowLeftRight, Zap, Cable, Wind, type LucideIcon } from 'lucide-react';

/** Returns a thematic Lucide icon component for a given fuel type string */
export function getFuelIcon(fuel: string): LucideIcon {
  switch (fuel.toLowerCase()) {
    case 'gas':           return Flame;
    case 'wind':          return Wind;
    case 'solar':         return Sun;
    case 'nuclear':       return Atom;
    case 'hydro':         return Droplets;
    case 'biomass':       return Leaf;
    case 'coal':          return Mountain;
    case 'imports':       return ArrowLeftRight;
    case 'interconnectors': return Cable;
    default:              return Zap;
  }
}

/** Raw hex for each fuel — used for rgba() card tinting and fill bars */
export function getFuelHex(fuel: string): string {
  switch (fuel.toLowerCase()) {
    case 'gas':     return '#f97316'; // orange
    case 'wind':    return '#38bdf8'; // sky blue
    case 'solar':   return '#facc15'; // yellow
    case 'nuclear': return '#a78bfa'; // purple
    case 'hydro':   return '#34d399'; // emerald
    case 'biomass': return '#4ade80'; // green
    case 'coal':    return '#78716c'; // stone
    case 'imports': return '#f472b6'; // pink
    default:        return '#94a3b8'; // slate
  }
}


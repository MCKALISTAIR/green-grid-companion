import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { Home, ListOrdered, Calendar, Settings, Clock, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { VERSION_STRING } from '@/lib/version';
import { motion } from 'framer-motion';

export function SideNav() {
    const navigate = useTransitionNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    const NavItem = ({ path, icon: Icon, label, dataTour }: { path: string; icon: LucideIcon; label: string; dataTour?: string }) => (
        <Button
            variant="ghost"
            className={`w-full justify-start h-10 relative transition-all group ${
                isActive(path) 
                    ? 'text-primary font-medium' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
            }`}
            onClick={() => navigate(path)}
            data-tour={dataTour}
        >
            {isActive(path) && (
                <motion.div
                    layoutId="side-nav-active-pill"
                    className="absolute inset-0 rounded-lg bg-primary/10 -z-10 border-l-2 border-primary"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
            )}
            <motion.div
                className="flex items-center gap-3 w-full"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
                <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                {label}
            </motion.div>
        </Button>
    );

    return (
        <div id="side-nav" className="hidden lg:flex flex-col w-64 h-full border-r border-border bg-card/50 backdrop-blur-xl fixed left-0 top-0 z-50 p-4">
            {/* Logo / Brand */}
            <div className="flex items-center gap-2 px-2 py-4 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary-foreground fill-current" />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-lg leading-none">GridSense</span>
                    <span className="text-xs text-muted-foreground">Companion</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
                <NavItem path="/" icon={Home} label="Dashboard" />
                <NavItem path="/planner" icon={Calendar} label="Power Planner" dataTour="nav-plan" />
                <NavItem path="/history" icon={Clock} label="History" dataTour="nav-history" />
                <NavItem path="/map" icon={ListOrdered} label="Region Rank" dataTour="nav-rank" />
            </nav>

            {/* Footer / Settings */}
            <div className="mt-auto pt-4">
                <Separator className="mb-4" />
                <NavItem path="/settings" icon={Settings} label="Settings" />
                <div className="mt-4 px-2">
                    <p className="text-xs text-muted-foreground text-center">
                        {VERSION_STRING}
                    </p>
                </div>
            </div>
        </div>
    );
}

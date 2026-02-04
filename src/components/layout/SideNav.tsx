import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ListOrdered, Calendar, Settings, Clock, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { VERSION_STRING } from '@/lib/version';

export function SideNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    const NavItem = ({ path, icon: Icon, label }: { path: string; icon: LucideIcon; label: string }) => (
        <Button
            variant={isActive(path) ? 'secondary' : 'ghost'}
            className={`w-full justify-start gap-3 h-10 ${isActive(path) ? 'font-medium' : 'text-muted-foreground'}`}
            onClick={() => navigate(path)}
        >
            <Icon className="w-5 h-5" />
            {label}
        </Button>
    );

    return (
        <div className="hidden lg:flex flex-col w-64 h-full border-r border-border bg-card/50 backdrop-blur-xl fixed left-0 top-0 z-50 p-4">
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
                <NavItem path="/planner" icon={Calendar} label="Power Planner" />
                <NavItem path="/history" icon={Clock} label="History" />
                <NavItem path="/map" icon={ListOrdered} label="Region Rank" />
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

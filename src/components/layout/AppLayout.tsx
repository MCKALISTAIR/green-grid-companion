import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { SideNav } from './SideNav';

export function AppLayout() {
    const location = useLocation();
    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-[100vh] bg-background font-sans" style={{ minHeight: 'calc(100vh + env(safe-area-inset-top) + env(safe-area-inset-bottom))' }}>
            {/* Desktop Sidebar - Hidden on mobile */}
            <SideNav />

            {/* Main Content Area */}
            <div className="lg:pl-64 flex flex-col min-h-[100vh]" style={{ minHeight: 'calc(100vh + env(safe-area-inset-top) + env(safe-area-inset-bottom))' }}>
                <main className="flex-1 w-full max-w-7xl mx-auto pb-24 lg:pb-0">
                    {/* Wrap outlet in a keyed transition container to trigger animations on path changes */}
                    <div key={location.pathname} className="animate-page-enter">
                        <Outlet />
                    </div>
                </main>

                {/* Mobile Bottom Nav - Hidden on lg screens */}
                <div className="lg:hidden">
                    <BottomNav onHomeClick={handleScrollToTop} />
                </div>
            </div>
        </div>
    );
}

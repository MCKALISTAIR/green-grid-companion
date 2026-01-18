import { NotificationSettings } from '@/components/NotificationSettings';
import { Integrations } from '@/components/Integrations';
import { BottomNav } from '@/components/BottomNav';

export default function Settings() {
    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <div className="p-4 pt-[max(2rem,env(safe-area-inset-top))] space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Manage notifications and preferences.</p>
                </div>

                {/* Integrations commented out for App Store compliance (Guideline 2.2) until fully functional */}
                {/* <Integrations /> */}
                <NotificationSettings />

                <div className="text-xs text-muted-foreground text-center space-y-2 pt-8 pb-4">
                    <p>
                        Developed by <a href="https://alistair-mckay.lovable.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Alistair McKay</a>
                    </p>
                    <p>
                        Data sourced from <a href="https://www.carbonintensity.org.uk/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">National Grid ESO</a>
                    </p>
                    <p>
                        <a href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</a>
                    </p>
                </div>
            </div>
            <BottomNav />
        </div>
    );
}

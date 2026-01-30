import { Link } from 'react-router-dom';
import { ChevronRight, GraduationCap, Shield, MapPin, History, MessageSquare } from 'lucide-react';
import { NotificationSettings } from '@/components/NotificationSettings';
import { OctopusIntegration } from '@/components/OctopusIntegration';
import { TeslaIntegration } from '@/components/TeslaIntegration';
import { AccountBackup } from '@/components/AccountBackup';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { useTeslaEnergy } from '@/hooks/useTeslaEnergy';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { VERSION_STRING } from '@/lib/version';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';


export default function Settings() {
    const { isLinked } = useOctopusEnergy();
    const { isLinked: isTeslaLinked } = useTeslaEnergy();
    const { hasNewVersion } = useVersionCheck();

    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <div className="p-4 pt-[calc(env(safe-area-inset-top)+2rem)] space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Manage notifications and preferences.</p>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Account</h2>
                    <AccountBackup />
                </div>

                <OctopusIntegration />
                <TeslaIntegration />
                <NotificationSettings />

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Preferences</h2>

                    <div className="flex flex-col gap-3">
                        <Link to="/locations">
                            <div className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <MapPin className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Manage Locations</h3>
                                        <p className="text-sm text-muted-foreground">Edit saved locations & clear history</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Resources</h2>

                    <div className="flex flex-col gap-3">
                        <Link to="/glossary">
                            <div className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <GraduationCap className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Energy Literacy</h3>
                                        <p className="text-sm text-muted-foreground">Learn about fuel types & terms</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </Link>

                        <Link to="/changelog">
                            <div className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full relative">
                                        <History className="w-5 h-5 text-primary" />
                                        {hasNewVersion && (
                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <h3 className="font-medium">What's New</h3>
                                            <p className="text-sm text-muted-foreground">View changelog & version history</p>
                                        </div>
                                        {hasNewVersion && (
                                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                                                New
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </Link>

                        <Link to="/privacy">
                            <div className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-full">
                                        <Shield className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Privacy Policy</h3>
                                        <p className="text-sm text-muted-foreground">How we handle your data</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Support</h2>

                    <div className="flex flex-col gap-3">
                        <a href="mailto:support@gridsense.app?subject=GridSense%20Feedback">
                            <div className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <MessageSquare className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Send Feedback</h3>
                                        <p className="text-sm text-muted-foreground">Report bugs or suggest features</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </a>
                    </div>
                </div>

                <div className="text-xs text-muted-foreground text-center space-y-2 pt-8 pb-4">
                    <p>
                        Developed by <a href="https://alistair-mckay.lovable.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Alistair McKay</a>
                    </p>
                    <p>
                        Carbon data from <a href="https://www.carbonintensity.org.uk/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">National Grid ESO</a>
                    </p>
                    {isLinked && (
                        <p>
                            Footprint data powered by <a href="https://developer.octopus.energy/docs/api/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Octopus Energy API</a>
                        </p>
                    )}
                    {isTeslaLinked && (
                        <p>
                            Vehicle & Energy data powered by <a href="https://developer.tesla.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Tesla Fleet API</a>
                        </p>
                    )}
                    <p className="pt-2">
                        <Link to="/changelog" className="text-primary hover:underline">{VERSION_STRING}</Link>
                    </p>
                </div>

                {/* Debug Section */}
                <div className="border-t border-border pt-8 pb-4">
                    <h2 className="text-lg font-semibold mb-4 px-1">Debug</h2>
                    <div className="p-4 bg-card border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">Test Error Tracking</h3>
                                <p className="text-sm text-muted-foreground">Sends a test error to Sentry</p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    try {
                                        throw new Error("This is a test error from GridSense Settings");
                                    } catch (error) {
                                        // We import logger dynamically or from top level. 
                                        // Settings.tsx doesn't import logger yet. 
                                        // We need to ensure logger is imported.
                                        // Actually, I'll update the imports in a separate call or use window.logger if exposed? 
                                        // No, I should import it.
                                        // I'll add the import in the next step.
                                        console.error("Test error triggered", error);
                                        import('@/lib/logger').then(({ logger }) => {
                                            logger.error("Test error triggered by user", { error });
                                        });
                                    }
                                    // Also direct Sentry capture for verification
                                    import('@sentry/react').then(Sentry => {
                                        Sentry.captureMessage("Test Message from GridSense Settings");
                                    });
                                }}
                            >
                                <Zap className="w-4 h-4 mr-2" />
                                Trigger Error
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

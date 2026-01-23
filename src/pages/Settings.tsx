import { Link } from 'react-router-dom';
import { ChevronRight, GraduationCap, Shield, MapPin } from 'lucide-react';
import { NotificationSettings } from '@/components/NotificationSettings';
import { OctopusIntegration } from '@/components/OctopusIntegration';


export default function Settings() {
    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <div className="p-4 pt-[calc(env(safe-area-inset-top)+2rem)] space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Manage notifications and preferences.</p>
                </div>

                <OctopusIntegration />
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

                <div className="text-xs text-muted-foreground text-center space-y-2 pt-8 pb-4">
                    <p>
                        Developed by <a href="https://alistair-mckay.lovable.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Alistair McKay</a>
                    </p>
                    <p>
                        Data sourced from <a href="https://www.carbonintensity.org.uk/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">National Grid ESO</a>
                    </p>
                    <p>
                        Powered by <a href="https://developer.octopus.energy/docs/api/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Octopus Energy API</a>
                    </p>

                </div>
            </div>

        </div>
    );
}

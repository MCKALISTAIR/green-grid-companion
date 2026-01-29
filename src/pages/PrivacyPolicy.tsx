import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
                <div className="flex items-center gap-2 max-w-2xl mx-auto">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-semibold">Privacy Policy</h1>
                </div>
            </div>

            <div className="p-4 max-w-2xl mx-auto space-y-6">
                <div className="space-y-2">
                    <p className="text-muted-foreground">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                    <p>
                        Hello! I'm Alistair McKay. Apps should be honest and respectful of your data.
                        As a hobbyist developer, I built GridSense to help you track energy intensity, not to track you.
                    </p>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">No Personal Data Collection</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        I do not collect, store, or share your personal data. I don't have a database of users, and I don't track your behaviour.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Lock className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">Your Location Data</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>
                            GridSense uses your location solely to identify your local energy region (e.g., "South Wales").
                        </p>
                        <p>
                            <span className="font-semibold text-foreground">Local Processing:</span> Your exact coordinates are processed locally on your device or sent anonymously to <code>postcodes.io</code> to convert coordinates into a postcode outcode (e.g., "CF10").
                        </p>
                        <p>
                            <span className="font-semibold text-foreground">No History:</span> I do not save a history of where you have been. Your selected region is stored locally on your device so you don't have to select it every time you open the app.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Server className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">Third Party Services</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>The app interacts with the following public APIs to function:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>
                                <strong>National Grid ESO</strong>: To fetch carbon intensity data for your region.
                            </li>
                            <li>
                                <strong>Octopus Energy</strong>: To securely fetch your smart meter consumption data (only if you voluntarily link your account).
                            </li>
                            <li>
                                <strong>Postcodes.io</strong>: To convert your GPS coordinates into a postcode district (if you use "Current Location").
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <div className="text-sm text-muted-foreground pt-4">
                    <p>
                        If you have any questions about this policy or the app, please feel free to reach out.
                    </p>
                </div>
            </div>
        </div>
    );
}

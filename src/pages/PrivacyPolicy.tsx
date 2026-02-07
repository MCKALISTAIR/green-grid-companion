import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Server, UserCheck, Download, Trash2, Database, Eye } from 'lucide-react';
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
                        Last updated: 7 February 2026
                    </p>
                    <p>
                        Hello! I'm Alistair McKay. Apps should be honest and respectful of your data.
                        As a hobbyist developer, I built GridSense to help you track energy intensity, not to track you.
                    </p>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">Data We Collect</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>
                            GridSense collects only the data necessary to provide its features. If you choose to sign in and link integrations, we store:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Account data:</strong> Your email address and authentication provider (Google or Apple).</li>
                            <li><strong>Octopus Energy data:</strong> Your account number, API key, meter details, consumption history, and calculated carbon footprint — only if you voluntarily link your account.</li>
                            <li><strong>Tesla data:</strong> Vehicle details, charging sessions, and energy site data — only if you voluntarily link your Tesla account.</li>
                            <li><strong>Preferences:</strong> Saved locations, household profile, and notification settings.</li>
                        </ul>
                        <p>
                            If you use GridSense without signing in, your data is stored locally on your device only.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Lock className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">How We Protect Your Data</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>
                            Your data is protected by industry-standard security measures:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>All data is encrypted in transit (HTTPS/TLS) and at rest.</li>
                            <li>API keys and credentials are stored securely and are only accessible by server-side functions — never exposed to other users or the frontend.</li>
                            <li>Row-level security ensures you can only access your own data.</li>
                            <li>Authentication is handled via Google and Apple OAuth — we never see or store your passwords.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Eye className="w-5 h-5 text-primary" />
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
                            <span className="font-semibold text-foreground">No Tracking:</span> We do not save a history of where you have been. Your selected region is stored locally on your device so you don't have to select it every time you open the app.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Server className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">Third-Party Services</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>The app interacts with the following services to function:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>
                                <strong>National Grid ESO</strong> — To fetch carbon intensity data for your region.
                            </li>
                            <li>
                                <strong>Octopus Energy API</strong> — To securely fetch your smart meter consumption data (only if you voluntarily link your account).
                            </li>
                            <li>
                                <strong>Tesla API</strong> — To fetch vehicle and energy site data (only if you voluntarily link your account).
                            </li>
                            <li>
                                <strong>Postcodes.io</strong> — To convert GPS coordinates into a postcode district (if you use "Current Location").
                            </li>
                            <li>
                                <strong>Google & Apple OAuth</strong> — For secure authentication. We receive only your email and name.
                            </li>
                        </ul>
                        <p>
                            We do not sell, share, or transfer your data to any third parties for marketing or advertising purposes.
                        </p>
                    </CardContent>
                </Card>

                <div className="space-y-1">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-primary" />
                        Your Rights (GDPR)
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Under the General Data Protection Regulation (GDPR), you have the following rights regarding your personal data:
                    </p>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Database className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">Right of Access (Article 15)</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        You have the right to know what personal data we hold about you. You can view your account information at any time in <strong>Settings → Account</strong>.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Download className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">Right to Data Portability (Article 20)</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>
                            You have the right to receive your personal data in a structured, commonly used, and machine-readable format.
                        </p>
                        <p>
                            Use the <strong>"Download My Data"</strong> button in <strong>Settings → Account</strong> to export all your data as a JSON file. This includes your account details, energy consumption history, carbon footprint records, Tesla data, and preferences.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Trash2 className="w-5 h-5 text-destructive" />
                        <CardTitle className="text-base">Right to Erasure (Article 17)</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>
                            You have the right to have your personal data permanently deleted. Use the <strong>"Delete Account"</strong> button in <strong>Settings → Account</strong> to permanently remove:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Your authentication account and email</li>
                            <li>Octopus Energy credentials, meter data, and consumption history</li>
                            <li>Carbon footprint calculations</li>
                            <li>Tesla credentials, vehicles, charging sessions, and energy data</li>
                            <li>All saved preferences and locations</li>
                        </ul>
                        <p className="font-medium text-foreground">
                            This action is irreversible. We recommend downloading your data first.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">Data Retention</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>
                            We retain your data only for as long as your account is active. When you delete your account, all associated data is permanently removed from our servers immediately.
                        </p>
                        <p>
                            If you use GridSense without signing in, data is stored locally on your device and can be cleared by uninstalling the app or clearing browser data.
                        </p>
                    </CardContent>
                </Card>

                <div className="text-sm text-muted-foreground pt-4 space-y-2">
                    <p>
                        <strong>Legal Basis for Processing:</strong> We process your data based on your explicit consent (when you sign in and link integrations) and legitimate interest (providing the app's core functionality).
                    </p>
                    <p>
                        If you have any questions about this policy, your data, or wish to exercise your rights, please feel free to reach out.
                    </p>
                </div>
            </div>
        </div>
    );
}

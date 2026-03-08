import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, GraduationCap, Shield, MapPin, History, MessageSquare, Home, Cloud, RefreshCw, Activity, Sparkles, Monitor, Download, Cookie, Play, Paintbrush } from 'lucide-react';
import { NotificationSettings } from '@/components/NotificationSettings';
import { OctopusIntegration } from '@/components/OctopusIntegration';
import { TeslaIntegration } from '@/components/TeslaIntegration';
import { AccountBackup } from '@/components/AccountBackup';
import { YearWrapped } from '@/components/YearWrapped';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { useTeslaEnergy } from '@/hooks/useTeslaEnergy';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { VERSION_STRING } from '@/lib/version';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useEnergyFacts } from '@/hooks/useEnergyFacts';
import { useAchievements } from '@/hooks/useAchievements';
import { useSceneDirector } from '@/hooks/useSceneDirector';
import { Zap, Trophy, Lock, Construction } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { HouseType, OFGEM_TDCV_2025 } from '@/lib/energy-standards';
import { toast } from 'sonner';
import { useProductTour } from '@/hooks/useProductTour';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useAppLocation } from '@/contexts/LocationContext';
import { useOffline } from '@/hooks/useOffline';
import { useSceneType } from '@/hooks/useSceneType';


export default function Settings() {
    const [showYearWrapped, setShowYearWrapped] = useState(false);
    const { isLinked } = useOctopusEnergy();
    const { isLinked: isTeslaLinked } = useTeslaEnergy();
    const { hasNewVersion } = useVersionCheck();
    const { tone, setTone } = useEnergyFacts();
    const { achievements } = useAchievements();
    const { unlocked, handleVersionTap } = useSceneDirector();
    const { houseType, setHouseType, customAnnualKwh, setCustomAnnualKwh, showGridFrequency, setShowGridFrequency, isAuthenticated, isSyncing, lastSyncedAt, syncNow } = useSettings();
    const { replayTour } = useProductTour();
    const { postcode } = useAppLocation();
    const { lastUpdated: gridLastUpdated, refetch: refetchGrid, isBackgroundFetching: isGridFetching } = useCarbonData(postcode);
    const { isOffline } = useOffline();
    const { preference: scenePreference, setPreference: setScenePreference, autoDetected } = useSceneType();

    const formatLastSync = (date: Date | null) => {
        if (!date) return 'Not yet synced';
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const onVersionClick = () => {
        handleVersionTap();
        // Feedback for tapping (optional, maybe standard '7 taps remaining')
        // Logic inside hook handles the state, but we might want intermediate feedback?
        // Let's keep it secret for now, or use the tapCount from hook if we exported it.
    };

    // Simple platform detection
    const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh');

    // Achievements link will be rendered below

    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <div className="p-4 pt-[calc(max(env(safe-area-inset-top),59px)+2rem)] space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Manage notifications and preferences.</p>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Account</h2>
                    <AccountBackup
                        isSyncing={isSyncing}
                        lastSyncedAt={lastSyncedAt}
                        onSyncNow={syncNow}
                        formatLastSync={formatLastSync}
                    />
                </div>

                <OctopusIntegration />
                <TeslaIntegration />
                <NotificationSettings />

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Badges
                    </h2>
                    <Link to="/achievements">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg hover:from-primary/15 hover:to-primary/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-full">
                                    <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Trophy Room</h3>
                                    <p className="text-sm text-muted-foreground">View your unlocked achievements</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                    </Link>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Household Profile</h2>
                    <div className="p-4 bg-card border rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                            <Home className="w-5 h-5 text-primary" />
                            <div>
                                <h3 className="font-medium">House Type</h3>
                                <p className="text-sm text-muted-foreground">Used for benchmarks.</p>
                            </div>
                        </div>

                        <RadioGroup
                            value={houseType}
                            onValueChange={(val) => setHouseType(val as HouseType)}
                            className="flex flex-col gap-2 pt-1"
                        >
                            {(Object.entries(OFGEM_TDCV_2025) as [HouseType, typeof OFGEM_TDCV_2025['LOW']][]).map(([key, value]) => (
                                <div key={key} className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50 transition-colors">
                                    <RadioGroupItem value={key} id={`house-${key}`} className="mt-1" />
                                    <div className="grid gap-0.5">
                                        <Label htmlFor={`house-${key}`} className="font-medium">
                                            {value.label}
                                        </Label>
                                        <span className="text-xs text-muted-foreground">
                                            ~{value.annualKwh.toLocaleString()} kWh/year
                                        </span>
                                    </div>
                                </div>
                            ))}

                            <div className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value="CUSTOM" id="house-CUSTOM" className="mt-1" />
                                <div className="grid gap-2 w-full pr-2">
                                    <Label htmlFor="house-CUSTOM" className="font-medium">
                                        Custom Estimate
                                    </Label>
                                    <div className="text-xs text-muted-foreground mb-1">
                                        Enter your own annual consumption if known.
                                    </div>

                                    {houseType === 'CUSTOM' && (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="relative flex-1 max-w-[140px]">
                                                <input
                                                    type="number"
                                                    value={customAnnualKwh || ''}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        if (!isNaN(val) && val >= 0) {
                                                            setCustomAnnualKwh(val);
                                                        }
                                                    }}
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                    placeholder="2900"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                                    kWh
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                {isMac && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        <h2 className="text-xl font-semibold">Desktop Companion</h2>
                        <div className="p-4 bg-gradient-to-br from-card to-accent/5 border rounded-lg space-y-3 relative overflow-hidden">
                            {/* Decorative background icon */}
                            <Monitor className="absolute -right-4 -bottom-4 w-24 h-24 text-accent/10 rotate-[-15deg]" />

                            <div className="flex items-start gap-3 relative z-10">
                                <div className="p-2.5 bg-primary/10 rounded-xl">
                                    <Monitor className="w-6 h-6 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-medium text-base">GridSense Menu Bar</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Keep an eye on the grid from your desktop. Our native menu bar app shows live intensity and upcoming forecasts at a glance.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2 relative z-10">
                                <Button
                                    className="w-full sm:w-auto gap-2 shadow-sm"
                                    onClick={() => window.open('https://github.com/MCKALISTAIR/green-grid-companion/releases', '_blank')}
                                >
                                    <Download className="w-4 h-4" />
                                    Download for macOS
                                </Button>
                                <p className="text-[10px] text-muted-foreground mt-2 text-center sm:text-left">
                                    Requires macOS 11.0 or later.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Preferences</h2>

                    <div className="flex flex-col gap-3">
                        {/* Commentary Style Preference */}
                        <div className="p-4 bg-card border rounded-lg space-y-3">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-primary" />
                                <div>
                                    <h3 className="font-medium">Commentary Style</h3>
                                    <p className="text-sm text-muted-foreground">Choose the tone of energy facts.</p>
                                </div>
                            </div>

                            <RadioGroup
                                value={tone}
                                onValueChange={(val) => setTone(val as typeof tone)}
                                className="flex gap-4 pt-1"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="friendly" id="tone-friendly" />
                                    <Label htmlFor="tone-friendly">Friendly</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="snarky" id="tone-snarky" />
                                    <Label htmlFor="tone-snarky">Snarky</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mixed" id="tone-mixed" />
                                    <Label htmlFor="tone-mixed">Mixed</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Grid Frequency Toggle */}
                        <div className="p-4 bg-card border rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <Activity className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Show Grid Frequency</h3>
                                        <p className="text-sm text-muted-foreground">Display live 50Hz frequency data</p>
                                    </div>
                                </div>
                                <button
                                    role="switch"
                                    aria-checked={showGridFrequency}
                                    onClick={() => setShowGridFrequency(!showGridFrequency)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${showGridFrequency ? 'bg-primary' : 'bg-input'}`}
                                >
                                    <span
                                        className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${showGridFrequency ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Scene Type Preference */}
                        <div className="p-4 bg-card border rounded-lg space-y-3">
                            <div className="flex items-center gap-2">
                                <Paintbrush className="w-5 h-5 text-primary" />
                                <div>
                                    <h3 className="font-medium">Scene Theme</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Choose your landscape style
                                        {scenePreference === 'auto' && (
                                            <span className="ml-1 text-xs text-primary">(detected: {autoDetected})</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <RadioGroup
                                value={scenePreference}
                                onValueChange={(val) => setScenePreference(val as 'auto' | 'countryside' | 'city')}
                                className="flex gap-4 pt-1"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="auto" id="scene-auto" />
                                    <Label htmlFor="scene-auto">Auto</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="countryside" id="scene-countryside" />
                                    <Label htmlFor="scene-countryside">🌿 Countryside</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="city" id="scene-city" />
                                    <Label htmlFor="scene-city">🏙️ City</Label>
                                </div>
                            </RadioGroup>
                        </div>

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

                        {/* Cookie Preferences */}
                        <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Cookie className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Cookie Preferences</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {localStorage.getItem('cookie-consent')
                                            ? `Currently: ${localStorage.getItem('cookie-consent')}`
                                            : 'Not yet set'}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    localStorage.removeItem('cookie-consent');
                                    toast.success('Cookie preferences reset. The banner will reappear.');
                                    window.location.reload();
                                }}
                            >
                                Reset
                            </Button>
                        </div>

                        {/* Replay Product Tour */}
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg hover:from-primary/15 hover:to-primary/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-full">
                                    <Play className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Take a Tour</h3>
                                    <p className="text-sm text-muted-foreground">Discover all the app's features</p>
                                </div>
                            </div>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                    replayTour();
                                    toast.success('Starting tour...');
                                }}
                            >
                                Start
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Resources</h2>

                    <div className="flex flex-col gap-3">
                        {/* Only show Year Wrapped button in December */}
                        {new Date().getMonth() === 11 && (
                            <button onClick={() => setShowYearWrapped(true)}>
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-chart-4/10 border border-primary/20 rounded-lg hover:from-primary/20 hover:to-chart-4/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/20 rounded-full">
                                            <Sparkles className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-medium">{new Date().getFullYear()} Grid Wrapped</h3>
                                            <p className="text-sm text-muted-foreground">Your year in UK electricity</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px]">New</Badge>
                                </div>
                            </button>
                        )}

                        <Link to="/feature-guides">
                            <div className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <GraduationCap className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Feature Guides</h3>
                                        <p className="text-sm text-muted-foreground">Detailed how-to guides for each feature</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </Link>

                        <Link to="/help">
                            <div className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <MessageSquare className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium">Help & Tips</h3>
                                        <p className="text-sm text-muted-foreground">Quick answers & FAQs</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </Link>

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
                        <a href="mailto:allymckay5@gmail.com?subject=GridSense%20Feedback">
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
                    <div className="pt-2 flex flex-col items-center gap-1">
                        <span
                            onClick={(e) => { e.preventDefault(); onVersionClick(); }}
                            onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onVersionClick(); } }}
                            className="bg-transparent border-0 p-0 text-primary hover:underline cursor-pointer select-none"
                            role="button"
                            aria-label="Tap version number multiple times to unlock developer features"
                            tabIndex={0}
                        >
                            {VERSION_STRING}
                        </span>
                        {unlocked && (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500 gap-1 mt-1 animate-in fade-in zoom-in">
                                <Construction className="w-3 h-3" />
                                Director Mode Unlocked
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Data Sync Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Data Sync</h2>
                    <div className="p-4 bg-card border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Cloud className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-medium">Grid Network Data</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    Last checked: {gridLastUpdated ? new Date(gridLastUpdated).toLocaleTimeString() : 'Unknown'}
                                    {isOffline && <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">Offline</Badge>}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                refetchGrid();
                                toast.info("Checking for new data...");
                            }}
                            disabled={isGridFetching || isOffline}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isGridFetching ? 'animate-spin' : ''}`} />
                            Force Refresh
                        </Button>
                    </div>
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
                                        console.error("Test error triggered", error);
                                        import('@/lib/logger')
                                            .then(({ logger }) => {
                                                logger.error("Test error triggered by user", { error });
                                                toast.success("Error logged to Sentry successfully");
                                            })
                                            .catch((err) => {
                                                console.error("Failed to import logger:", err);
                                                toast.error("Failed to load logging module");
                                            });
                                    }
                                    // Also direct Sentry capture for verification
                                    import('@sentry/react')
                                        .then(Sentry => {
                                            Sentry.captureMessage("Test Message from GridSense Settings");
                                        })
                                        .catch((err) => {
                                            console.error("Failed to import Sentry:", err);
                                            toast.error("Failed to load error tracking");
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

            <YearWrapped
                open={showYearWrapped}
                onOpenChange={setShowYearWrapped}
                year={new Date().getFullYear()}
            />
        </div>
    );
}

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, ArrowRight, Bell, Zap, Home, Leaf, ChevronRight, Check } from 'lucide-react';
import { Geolocation as CapacitorGeolocation } from '@capacitor/geolocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import { useNotifications } from '@/hooks/useNotifications';
import useEmblaCarousel from 'embla-carousel-react';
import { HouseType, OFGEM_TDCV_2025 } from '@/lib/energy-standards';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';
import { useAppLocation } from '@/contexts/LocationContext';

type OnboardingStep = 'welcome' | 'household' | 'location' | 'notifications';

const Onboarding = () => {
    const navigate = useNavigate();
    const { setPostcode: setAppPostcode } = useAppLocation();
    const [step, setStep] = useState<OnboardingStep>('welcome');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [manualPostcode, setManualPostcode] = useState('');
    const { requestPermission, updatePreference } = useNotifications();
    const { setHouseType } = useSettings();
    const [selectedHouseType, setSelectedHouseType] = useState<HouseType>('MEDIUM');

    // Embla Carousel for Welcome Step
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.on('select', () => {
            setCurrentSlide(emblaApi.selectedScrollSnap());
        });
    }, [emblaApi]);

    // --- Actions ---

    const handleWelcomeNext = () => {
        if (emblaApi && currentSlide < 2) {
            emblaApi.scrollNext();
        } else {
            setStep('household');
        }
    };

    const handleHouseTypeSelect = (type: HouseType) => {
        setSelectedHouseType(type);
    };

    const confirmHouseType = () => {
        setHouseType(selectedHouseType);
        setStep('location');
    };

    const handleEnableLocation = async () => {
        setIsLoadingLocation(true);

        try {
            const permissionStatus = await CapacitorGeolocation.checkPermissions();

            if (permissionStatus.location === 'denied') {
                const request = await CapacitorGeolocation.requestPermissions();
                if (request.location === 'denied') {
                    toast.error("Location permission denied. Please enter postcode manually.");
                    setIsLoadingLocation(false);
                    return;
                }
            }

            const position = await CapacitorGeolocation.getCurrentPosition();
            const { latitude, longitude } = position.coords;

            // Use postcodes.io to reverse geocode
            const response = await fetch(`https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}`);
            const data = await response.json();

            if (data.status === 200 && data.result && data.result.length > 0) {
                const postcode = data.result[0].outcode; // e.g., "SW1A"

                setAppPostcode(postcode);
                toast.success(`Location set to ${postcode}`);
                setStep('notifications');
            } else {
                throw new Error("Could not determine postcode from location");
            }
        } catch (error) {
            logger.error('Onboarding geolocation failed', { error });
            let errorMessage = "Failed to get location.";
            if (error instanceof Error && error.message.includes('denied')) {
                errorMessage = "Location permission denied. Please enter postcode manually.";
            }
            toast.error(errorMessage);
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualPostcode.trim()) return;

        const cleanPostcode = manualPostcode.trim().toUpperCase();
        setAppPostcode(cleanPostcode);
        setStep('notifications');
    };

    const handleEnableNotifications = async () => {
        const granted = await requestPermission();
        if (granted) {
            updatePreference('lowIntensityEnabled', true);
            toast.success("Notifications enabled!");
        }
        completeOnboarding();
    };

    const handleSkipNotifications = () => {
        completeOnboarding();
    };

    const completeOnboarding = () => {
        // Mark onboarding as complete to trigger the tour on next load
        localStorage.setItem('onboarding_complete', 'true');
        navigate('/');
    };

    // --- Render Steps ---

    const renderWelcomeStep = () => (
        <div className="space-y-6">
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                    {/* Slide 1 */}
                    <div className="flex-[0_0_100%] min-w-0 space-y-4 px-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                            <Zap className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-center">Track Grid Intensity</h3>
                        <p className="text-center text-muted-foreground text-sm leading-relaxed">
                            See real-time carbon intensity of the UK National Grid. Know exactly how clean your electricity is, right now.
                        </p>
                    </div>
                    {/* Slide 2 */}
                    <div className="flex-[0_0_100%] min-w-0 space-y-4 px-4">
                        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                            <Leaf className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-center">Reduce Your Footprint</h3>
                        <p className="text-center text-muted-foreground text-sm leading-relaxed">
                            Shift your energy usage to greener times. Charge your EV or run appliances when wind and solar are generating power.
                        </p>
                    </div>
                    {/* Slide 3 */}
                    <div className="flex-[0_0_100%] min-w-0 space-y-4 px-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                            <Bell className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-center">Get Smart Alerts</h3>
                        <p className="text-center text-muted-foreground text-sm leading-relaxed">
                            Receive notifications when grid carbon intensity drops, so you never miss a green window.
                        </p>
                    </div>
                </div>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-4">
                {[0, 1, 2].map((idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "w-2 h-2 rounded-full transition-all duration-300",
                            currentSlide === idx ? "bg-primary w-6" : "bg-primary/20"
                        )}
                    />
                ))}
            </div>

            <Button className="w-full mt-6" size="lg" onClick={handleWelcomeNext}>
                {currentSlide === 2 ? 'Get Started' : 'Next'}
                {currentSlide === 2 ? <Check className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
        </div>
    );

    const renderHouseholdStep = () => (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Home className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">What's your home type?</h3>
                <p className="text-sm text-muted-foreground">We use this to estimate your carbon footprint accurately.</p>
            </div>

            <div className="space-y-3">
                {(['LOW', 'MEDIUM', 'HIGH'] as HouseType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => handleHouseTypeSelect(type)}
                        className={cn(
                            "w-full p-4 rounded-xl border text-left transition-all hover:bg-accent/50 relative overflow-hidden group",
                            selectedHouseType === type
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border bg-card"
                        )}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{OFGEM_TDCV_2025[type].label}</span>
                            {selectedHouseType === type && (
                                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                    <Check className="w-3 h-3" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">{OFGEM_TDCV_2025[type].description}</p>
                    </button>
                ))}
            </div>

            <Button className="w-full" size="lg" onClick={confirmHouseType}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </div>
    );

    const renderLocationStep = () => (
        <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <div className="text-center space-y-2 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <MapPin className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Where are you?</h3>
                <p className="text-sm text-muted-foreground">We need your location to find the nearest grid region.</p>
            </div>

            <Button
                size="lg"
                className="w-full font-semibold relative overflow-hidden group"
                onClick={handleEnableLocation}
                disabled={isLoadingLocation}
            >
                {isLoadingLocation ? (
                    <>
                        <TurbineSpinner size="sm" className="mr-2" />
                        Finding you...
                    </>
                ) : (
                    <>
                        <Navigation className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                        Use Current Location
                    </>
                )}
            </Button>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-2">
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter Postcode (e.g. SW1)"
                        value={manualPostcode}
                        onChange={(e) => setManualPostcode(e.target.value)}
                        className="bg-background/50 h-11"
                    />
                    <Button type="submit" variant="secondary" size="lg" disabled={!manualPostcode.trim()} className="px-4">
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </form>
        </div>
    );

    const renderNotificationsStep = () => (
        <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <div className="text-center space-y-2 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Bell className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Stay updated?</h3>
                <p className="text-sm text-muted-foreground">Get notified when energy is greenest. You can change this later.</p>
            </div>

            <div className="space-y-3">
                <Button
                    size="lg"
                    className="w-full font-semibold"
                    onClick={handleEnableNotifications}
                >
                    <Bell className="w-4 h-4 mr-2" />
                    Enable Alerts
                </Button>
                <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleSkipNotifications}
                >
                    Skip for now
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-6">
                    {step === 'welcome' && renderWelcomeStep()}
                    {step === 'household' && renderHouseholdStep()}
                    {step === 'location' && renderLocationStep()}
                    {step === 'notifications' && renderNotificationsStep()}
                </CardContent>
                <CardFooter className="justify-center py-4 bg-muted/20 text-xs text-muted-foreground">
                    <p>
                        By continuing, you agree to our{' '}
                        <a href="/privacy" className="underline hover:text-foreground transition-colors">
                            Privacy Policy
                        </a>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Onboarding;

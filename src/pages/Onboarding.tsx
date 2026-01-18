import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, ArrowRight, Loader2 } from 'lucide-react';
import { Geolocation as CapacitorGeolocation } from '@capacitor/geolocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

const Onboarding = () => {
    const navigate = useNavigate();
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [manualPostcode, setManualPostcode] = useState('');

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

                localStorage.setItem('gridgreen-postcode', postcode);
                toast.success(`Location set to ${postcode}`);
                navigate('/');
            } else {
                throw new Error("Could not determine postcode from location");
            }
        } catch (error) {
            console.error("Geolocation error:", error);
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

        // Basic validation could go here
        const cleanPostcode = manualPostcode.trim().toUpperCase();

        // We could technically validate against the API here too, but for now just save it.
        // The main page handles invalid postcodes gracefully (hopefully) or we assume user knows.
        // Let's do a quick validation fetch to be nice?
        // Actually, let's just save it. The main app will try to fetch data.

        localStorage.setItem('gridgreen-postcode', cleanPostcode);
        navigate('/');
    };

    return (
        <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Card className="w-full max-w-md shadow-xl border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome to GridSense</CardTitle>
                    <CardDescription>
                        To give you accurate carbon intensity data, we need to know your location.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <Button
                            size="lg"
                            className="w-full font-semibold relative overflow-hidden group"
                            onClick={handleEnableLocation}
                            disabled={isLoadingLocation}
                        >
                            {isLoadingLocation ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Finding you...
                                </>
                            ) : (
                                <>
                                    <Navigation className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                                    Use Current Location
                                </>
                            )}
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-muted" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                            </div>
                        </div>

                        <form onSubmit={handleManualSubmit} className="space-y-2" role="form" aria-label="Manual Postcode Entry">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter Postcode (e.g. SW1)"
                                    value={manualPostcode}
                                    onChange={(e) => setManualPostcode(e.target.value)}
                                    className="bg-background/50"
                                    aria-label="Enter your postcode"
                                />
                                <Button type="submit" variant="secondary" disabled={!manualPostcode.trim()} aria-label="Submit postcode">
                                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                </Button>
                            </div>
                        </form>
                    </div>
                </CardContent>
                <CardFooter className="justify-center text-xs text-muted-foreground text-center">
                    We only store your postcode locally on your device specifically for fetching energy data.
                </CardFooter>
            </Card>
        </div>
    );
};

export default Onboarding;

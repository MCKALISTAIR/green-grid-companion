import { useState, useEffect } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { resolvePostcode, getDistance, getRegionFromCoordinates } from '@/lib/location';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { logger } from '@/lib/logger';

interface LocationMismatchPromptProps {
    currentPostcode: string;
    onUpdate: (newPostcode: string) => void;
}

export function LocationMismatchPrompt({ currentPostcode, onUpdate }: LocationMismatchPromptProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [detectedRegion, setDetectedRegion] = useState<{ name: string, postcode: string } | null>(null);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        // Don't check if we've already checked this session or if no postcode is set
        if (hasChecked || !currentPostcode) return;

        async function checkLocation() {
            try {
                // 1. Get current device location
                let lat, lon;

                if (Capacitor.isNativePlatform()) {
                    const pos = await Geolocation.getCurrentPosition({ timeout: 5000 });
                    lat = pos.coords.latitude;
                    lon = pos.coords.longitude;
                } else if ('geolocation' in navigator) {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    lat = pos.coords.latitude;
                    lon = pos.coords.longitude;
                } else {
                    return; // No geolocation available
                }

                // 2. Resolve current postcode to coords
                const currentCoords = await resolvePostcode(currentPostcode);
                if (!currentCoords) return;

                // 3. Calculate distance
                const dist = getDistance(lat, lon, currentCoords.lat, currentCoords.lon);

                // 4. If distance > 20km, suggest switch
                if (dist > 20) {
                    logger.info(`Location mismatch detected (${dist.toFixed(1)}km). checking for local region...`);
                    const localRegion = await getRegionFromCoordinates(lat, lon);

                    if (localRegion && localRegion.regionPostcode !== currentPostcode) {
                        setDetectedRegion({
                            name: localRegion.regionName,
                            postcode: localRegion.regionPostcode
                        });
                        setIsVisible(true);
                    }
                }
            } catch (error) {
                logger.debug('Failed to check location mismatch', { error });
            } finally {
                setHasChecked(true);
            }
        }

        // Small delay to let app load first
        const timer = setTimeout(checkLocation, 3000);
        return () => clearTimeout(timer);
    }, [currentPostcode, hasChecked]);

    if (!isVisible || !detectedRegion) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-8 md:w-96"
                >
                    <Card className="p-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur-md">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-primary/10 rounded-full shrink-0">
                                <Navigation className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <h4 className="font-medium text-sm">Update Location?</h4>
                                <p className="text-xs text-muted-foreground">
                                    It looks like you're in <strong>{detectedRegion.name}</strong>.
                                    Would you like to see grid data for this area instead?
                                </p>
                                <div className="flex gap-2 mt-3 block">
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            onUpdate(detectedRegion.postcode);
                                            setIsVisible(false);
                                        }}
                                        className="h-8 text-xs"
                                    >
                                        Update Region
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsVisible(false)}
                                        className="h-8 text-xs"
                                    >
                                        No thanks
                                    </Button>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

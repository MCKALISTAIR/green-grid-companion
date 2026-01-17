import { RegionListItem } from '@/lib/carbonApi'; // Note: Ensure this matches API. Index uses RegionListItem.
import { getIntensityColor } from '@/lib/carbonApi';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface UKMapProps {
    regions: RegionListItem[];
    onRegionSelect?: (regionId: number) => void;
    selectedRegionId?: number;
}

// Approximate centroids for DNO regions (Lat, Lon)
// These define the geographic center of each region.
const REGION_COORDS: Record<string, { lat: number; lon: number }> = {
    'North Scotland': { lat: 57.5, lon: -4.5 },
    'South Scotland': { lat: 55.6, lon: -3.8 },
    'North East England': { lat: 55.0, lon: -1.7 },
    'North West England': { lat: 54.1, lon: -2.7 },
    'Yorkshire': { lat: 54.0, lon: -1.0 },
    'Merseyside and Northern Wales': { lat: 53.0, lon: -3.6 }, // Merged for approx
    'North Wales & Merseyside': { lat: 53.0, lon: -3.6 },     // Alias if API diff
    'East Midlands': { lat: 52.9, lon: -0.8 },
    'West Midlands': { lat: 52.5, lon: -2.2 },
    'East England': { lat: 52.3, lon: 0.6 },
    'South Wales': { lat: 51.8, lon: -3.6 },
    'London': { lat: 51.5, lon: -0.1 },
    'South East England': { lat: 51.1, lon: 0.4 },
    'Southern England': { lat: 51.2, lon: -1.4 },
    'South West England': { lat: 50.8, lon: -3.8 },
};

// Map projection helpers
// Tuned to fit the UK in the aspect ratio nicely
const MIN_LAT = 50.0;
const MAX_LAT = 58.5;
const MIN_LON = -6.0;
const MAX_LON = 2.0;

const getPosition = (lat: number, lon: number) => {
    // Flip Y because CSS top is 0
    const y = 100 - ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 100;
    const x = ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * 100;
    return { x, y };
};

export function UKMap({ regions, onRegionSelect, selectedRegionId }: UKMapProps) {

    return (
        <div className="relative w-full aspect-[3/4.5] max-w-sm mx-auto my-4 select-none">
            {/* Background Silhouette (This acts as the simplified map) */}
            <div className="absolute inset-4 bg-accent/5 rounded-[3rem] border border-border/30 -z-10 group overflow-hidden">
                {/* We could add an actual SVG path here for the UK outline if available */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-foreground to-transparent" />
            </div>

            <div className="absolute bottom-2 right-4 text-[10px] text-muted-foreground/40 font-medium">
                Geographic View
            </div>

            {/* Region Markers */}
            {regions.map((region) => {
                // Try precise name match, or looser match
                let coords = REGION_COORDS[region.shortname];
                if (!coords) {
                    // Fallback aliases?
                    if (region.shortname.includes('Merseyside')) coords = REGION_COORDS['Merseyside and Northern Wales'];
                    if (region.shortname.includes('South England')) coords = REGION_COORDS['Southern England'];
                }

                if (!coords) return null;

                const { x, y } = getPosition(coords.lat, coords.lon);
                const colorClass = getIntensityColor(region.intensity.index);
                const isSelected = selectedRegionId === region.regionid;

                return (
                    <motion.button
                        key={region.regionid}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: isSelected ? 1.4 : 1, opacity: 1, zIndex: isSelected ? 50 : 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={cn(
                            "absolute w-10 h-10 -ml-5 -mt-5 rounded-full flex items-center justify-center shadow-md transition-all duration-300",
                            colorClass,
                            isSelected ? "ring-4 ring-background shadow-xl" : "opacity-90 hover:opacity-100 hover:scale-110 hover:z-20 border-2 border-background/50"
                        )}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        onClick={() => onRegionSelect?.(region.regionid)}
                    >
                        <span className="text-[10px] font-bold text-white drop-shadow-md">
                            {region.intensity.forecast}
                        </span>
                        {isSelected && (
                            <motion.div
                                initial={{ y: 5, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute -bottom-8 bg-popover/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs shadow-lg border border-border/50 font-medium whitespace-nowrap text-popover-foreground z-50 pointer-events-none"
                            >
                                {region.shortname}
                            </motion.div>
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
